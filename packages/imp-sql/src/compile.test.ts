import { describe, expect, test } from "bun:test"
import type { Graph } from "imp-spec"
import { coreNodeLibrary } from "imp-spec"
import { collectionTransformsLibrary } from "imp-collection-transforms"
import { pathingLibrary } from "imp-pathing"
import { createRegistry, loadLibrary } from "imp-registry"
import { compileSql, graphToKysely } from "./compile.ts"

function testRegistry() {
  return loadLibrary(
    loadLibrary(
      loadLibrary(createRegistry(), coreNodeLibrary),
      collectionTransformsLibrary,
    ),
    pathingLibrary,
  )
}

const testEdgesSchema = {
  table: "items",
  edges: {
    table: "edges",
    sourceColumn: "source_id",
    targetColumn: "target_id",
    typeColumn: "type",
  },
} as const

/** input → filter(status = "active") → sort(title asc) → limit(10) → output */
function pipelineGraph(): Graph {
  return {
    nodes: {
      in: { id: "in", type: "input", inputs: {} },
      col: { id: "col", type: "column", inputs: { name: "status" } },
      lit: { id: "lit", type: "literal", inputs: { value: "active" } },
      eq: { id: "eq", type: "equals", inputs: {} },
      filter: { id: "filter", type: "filter", inputs: {} },
      sort: {
        id: "sort",
        type: "sort",
        inputs: { column: "title", direction: "asc" },
      },
      limit: { id: "limit", type: "limit", inputs: { count: 10 } },
      out: { id: "out", type: "output", inputs: {} },
    },
    edges: {
      e_col: { from: { node: "col", port: "value" }, to: { node: "eq", port: "left" } },
      e_lit: { from: { node: "lit", port: "value" }, to: { node: "eq", port: "right" } },
      e_pred: {
        from: { node: "eq", port: "value" },
        to: { node: "filter", port: "predicate" },
      },
      e_in: {
        from: { node: "in", port: "value" },
        to: { node: "filter", port: "collection" },
      },
      e_filter: {
        from: { node: "filter", port: "collection" },
        to: { node: "sort", port: "collection" },
      },
      e_sort: {
        from: { node: "sort", port: "collection" },
        to: { node: "limit", port: "collection" },
      },
      e_out: {
        from: { node: "limit", port: "collection" },
        to: { node: "out", port: "value" },
      },
    },
  }
}

describe("imp-sql", () => {
  test("lowers input → filter → sort → limit → output to SQLite SQL", () => {
    const compiled = graphToKysely(pipelineGraph(), {
      registry: testRegistry(),
      schema: { table: "items" },
    })
    const { sql, parameters } = compileSql(compiled)

    expect(sql).toContain('from "items"')
    expect(sql.toLowerCase()).toContain("where")
    expect(sql.toLowerCase()).toContain("order by")
    expect(sql.toLowerCase()).toContain("limit")
    expect(parameters).toContain("active")
    expect(parameters).toContain(10)
  })

  test("applies sort direction default when omitted", () => {
    const graph: Graph = {
      nodes: {
        in: { id: "in", type: "input", inputs: {} },
        sort: { id: "sort", type: "sort", inputs: { column: "name" } },
        out: { id: "out", type: "output", inputs: {} },
      },
      edges: {
        e1: {
          from: { node: "in", port: "value" },
          to: { node: "sort", port: "collection" },
        },
        e2: {
          from: { node: "sort", port: "collection" },
          to: { node: "out", port: "value" },
        },
      },
    }

    const { sql } = compileSql(
      graphToKysely(graph, {
        registry: testRegistry(),
        schema: { table: "people" },
      }),
    )
    expect(sql.toLowerCase()).toMatch(/order by.*"name".*asc/)
  })

  test("throws on unknown node type", () => {
    const graph: Graph = {
      nodes: {
        in: { id: "in", type: "input", inputs: {} },
        weird: { id: "weird", type: "no_such_type", inputs: {} },
        out: { id: "out", type: "output", inputs: {} },
      },
      edges: {
        e1: {
          from: { node: "in", port: "value" },
          to: { node: "weird", port: "collection" },
        },
        e2: {
          from: { node: "weird", port: "collection" },
          to: { node: "out", port: "value" },
        },
      },
    }

    expect(() =>
      graphToKysely(graph, {
        registry: testRegistry(),
        schema: { table: "t" },
      }),
    ).toThrow(/Unknown node type/)
  })

  test("throws when required input is missing", () => {
    const graph: Graph = {
      nodes: {
        in: { id: "in", type: "input", inputs: {} },
        limit: { id: "limit", type: "limit", inputs: {} },
        out: { id: "out", type: "output", inputs: {} },
      },
      edges: {
        e1: {
          from: { node: "in", port: "value" },
          to: { node: "limit", port: "collection" },
        },
        e2: {
          from: { node: "limit", port: "collection" },
          to: { node: "out", port: "value" },
        },
      },
    }

    expect(() =>
      graphToKysely(graph, {
        registry: testRegistry(),
        schema: { table: "t" },
      }),
    ).toThrow(/unsatisfied/)
  })

  test("lowers traverse to a join through schema.edges", () => {
    const graph: Graph = {
      nodes: {
        in: { id: "in", type: "input", inputs: {} },
        hop: {
          id: "hop",
          type: "traverse",
          inputs: { edgeType: "knows" },
        },
        out: { id: "out", type: "output", inputs: {} },
      },
      edges: {
        e1: {
          from: { node: "in", port: "value" },
          to: { node: "hop", port: "collection" },
        },
        e2: {
          from: { node: "hop", port: "collection" },
          to: { node: "out", port: "value" },
        },
      },
    }

    const { sql, parameters } = compileSql(
      graphToKysely(graph, {
        registry: testRegistry(),
        schema: testEdgesSchema,
      }),
    )
    expect(sql.toLowerCase()).toContain("join")
    expect(sql).toContain("edges")
    expect(sql).toContain("source_id")
    expect(sql).toContain("target_id")
    expect(sql.toLowerCase()).toContain("distinct")
    expect(parameters).toContain("knows")
  })

  test("throws when traverse is used without schema.edges", () => {
    const graph: Graph = {
      nodes: {
        in: { id: "in", type: "input", inputs: {} },
        hop: {
          id: "hop",
          type: "traverse",
          inputs: { edgeType: "knows" },
        },
        out: { id: "out", type: "output", inputs: {} },
      },
      edges: {
        e1: {
          from: { node: "in", port: "value" },
          to: { node: "hop", port: "collection" },
        },
        e2: {
          from: { node: "hop", port: "collection" },
          to: { node: "out", port: "value" },
        },
      },
    }

    expect(() =>
      graphToKysely(graph, {
        registry: testRegistry(),
        schema: { table: "items" },
      }),
    ).toThrow(/schema\.edges/)
  })

  test("uses schema.column mapper", () => {
    const graph: Graph = {
      nodes: {
        in: { id: "in", type: "input", inputs: {} },
        project: {
          id: "project",
          type: "project",
          inputs: { columns: "title" },
        },
        out: { id: "out", type: "output", inputs: {} },
      },
      edges: {
        e1: {
          from: { node: "in", port: "value" },
          to: { node: "project", port: "collection" },
        },
        e2: {
          from: { node: "project", port: "collection" },
          to: { node: "out", port: "value" },
        },
      },
    }

    const { sql } = compileSql(
      graphToKysely(graph, {
        registry: testRegistry(),
        schema: {
          table: "nodes",
          column: (name) => `json_extract(properties, '$.${name}')`,
        },
      }),
    )
    expect(sql).toContain("json_extract")
  })
})
