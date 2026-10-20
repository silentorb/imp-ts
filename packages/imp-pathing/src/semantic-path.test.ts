import { describe, expect, test } from "bun:test"
import type { Graph } from "imp-core-types"
import { coreNodeLibrary } from "imp-core-types"
import { collectionTransformsLibrary } from "imp-collection-transforms"
import { createRegistry, loadLibrary } from "imp-registry"
import { compileSql, compileSqlite } from "imp-sql"
import { bindSemanticPath } from "./bind"
import { desugarPath, mergeDesugarIntoGraph } from "./desugar"
import { pathingLibrary } from "./library"
import {
  mapPathOntology,
  resolveSemanticPath,
  SemanticPathResolveError,
} from "./resolve"

/** Fixture ontology: Feature → dependencies → Feature; title property on Feature. */
const fixtureOntology = mapPathOntology({
  Feature: {
    title: { kind: "property", name: "title" },
    alias: { kind: "property", name: "alias" },
    dependencies: {
      kind: "relationship",
      association: "01ASSOCDEPEND00000000000001",
      direction: 0,
      nextType: "Feature",
    },
    dependents: {
      kind: "relationship",
      association: "01ASSOCDEPEND00000000000001",
      direction: 1,
      nextType: "Feature",
    },
  },
  Character: {
    title: { kind: "property", name: "title" },
    scenes: {
      kind: "relationship",
      association: "01ASSOCSCENE00000000000002",
      direction: 0,
      nextType: "Scene",
    },
  },
  Scene: {
    title: { kind: "property", name: "title" },
  },
})

function testRegistry() {
  return loadLibrary(
    loadLibrary(
      loadLibrary(createRegistry(), coreNodeLibrary),
      collectionTransformsLibrary,
    ),
    pathingLibrary,
  )
}

describe("resolveSemanticPath", () => {
  test("field-only path", () => {
    const steps = resolveSemanticPath(["title"], fixtureOntology, "Feature")
    expect(steps).toEqual([{ kind: "field", name: "title" }])
  })

  test("edge-only path", () => {
    const steps = resolveSemanticPath(
      ["dependencies"],
      fixtureOntology,
      "Feature",
    )
    expect(steps).toEqual([
      {
        kind: "edge",
        association: "01ASSOCDEPEND00000000000001",
        direction: 0,
      },
    ])
  })

  test("edge then field", () => {
    const steps = resolveSemanticPath(
      ["dependencies", "title"],
      fixtureOntology,
      "Feature",
    )
    expect(steps).toEqual([
      {
        kind: "edge",
        association: "01ASSOCDEPEND00000000000001",
        direction: 0,
      },
      { kind: "field", name: "title" },
    ])
  })

  test("chained edges across types", () => {
    const steps = resolveSemanticPath(
      ["scenes", "title"],
      fixtureOntology,
      "Character",
    )
    expect(steps).toEqual([
      {
        kind: "edge",
        association: "01ASSOCSCENE00000000000002",
        direction: 0,
      },
      { kind: "field", name: "title" },
    ])
  })

  test("unknown token throws structured error", () => {
    expect(() =>
      resolveSemanticPath(["nope"], fixtureOntology, "Feature"),
    ).toThrow(SemanticPathResolveError)
    try {
      resolveSemanticPath(["nope"], fixtureOntology, "Feature")
    } catch (e) {
      expect(e).toBeInstanceOf(SemanticPathResolveError)
      const err = e as SemanticPathResolveError
      expect(err.detail.token).toBe("nope")
      expect(err.detail.typeId).toBe("Feature")
      expect(err.detail.tokenIndex).toBe(0)
    }
  })

  test("field then edge rejects (no context-descent)", () => {
    expect(() =>
      resolveSemanticPath(["title", "dependencies"], fixtureOntology, "Feature"),
    ).toThrow(/cannot continue after scalar/)
  })
})

describe("desugarPath", () => {
  test("expands edge then fields to traverse + project", () => {
    const fragment = desugarPath(
      [
        { kind: "edge", association: "knows", direction: 0 },
        { kind: "field", name: "title" },
        { kind: "field", name: "alias" },
      ],
      { prefix: "p", source: { node: "in", port: "value" } },
    )

    expect(Object.keys(fragment.nodes).sort()).toEqual([
      "p_project",
      "p_traverse_0",
    ])
    expect(fragment.nodes.p_traverse_0?.type).toBe("traverse")
    expect(fragment.nodes.p_traverse_0?.inputs).toMatchObject({
      association: "knows",
      direction: 0,
    })
    expect(fragment.nodes.p_project?.inputs.columns).toBe("title,alias")
    expect(fragment.collection).toEqual({ node: "p_project", port: "collection" })
  })

  test("chains multiple edge hops", () => {
    const fragment = desugarPath(
      [
        { kind: "edge", association: "knows", direction: 0 },
        { kind: "edge", association: "works_at", direction: 1 },
      ],
      { prefix: "p", source: { node: "in", port: "value" } },
    )
    expect(fragment.nodes.p_traverse_1?.inputs).toMatchObject({
      association: "works_at",
      direction: 1,
    })
    expect(fragment.collection).toEqual({
      node: "p_traverse_1",
      port: "collection",
    })
  })

  test("rejects field then edge (no context-descent)", () => {
    expect(() =>
      desugarPath(
        [
          { kind: "field", name: "title" },
          { kind: "edge", association: "knows", direction: 0 },
        ],
        { prefix: "p", source: { node: "in", port: "value" } },
      ),
    ).toThrow(/edge step after field|no context-descent/)
  })

  test("field-only path becomes project on the source collection", () => {
    const fragment = desugarPath([{ kind: "field", name: "title" }], {
      prefix: "p",
      source: { node: "in", port: "value" },
    })
    expect(fragment.nodes.p_project?.type).toBe("project")
    expect(fragment.collection.node).toBe("p_project")
  })

  test("asScalar on node endpoint projects id", () => {
    const fragment = desugarPath(
      [{ kind: "edge", association: "knows", direction: 0 }],
      {
        prefix: "p",
        source: { node: "in", port: "value" },
        asScalar: true,
      },
    )
    expect(fragment.nodes.p_project?.inputs.columns).toBe("id")
    expect(fragment.collection).toEqual({ node: "p_project", port: "collection" })
  })

  test("asScalar on empty path projects id on source", () => {
    const fragment = desugarPath([], {
      prefix: "p",
      source: { node: "in", port: "value" },
      asScalar: true,
    })
    expect(fragment.nodes.p_project?.inputs.columns).toBe("id")
  })

  test("asScalar does not override explicit trailing fields", () => {
    const fragment = desugarPath(
      [
        { kind: "edge", association: "knows", direction: 0 },
        { kind: "field", name: "title" },
      ],
      {
        prefix: "p",
        source: { node: "in", port: "value" },
        asScalar: true,
      },
    )
    expect(fragment.nodes.p_project?.inputs.columns).toBe("title")
  })

  test("mergeDesugarIntoGraph preserves existing nodes", () => {
    const base: Graph = {
      nodes: {
        in: { id: "in", type: "input", inputs: {} },
        out: { id: "out", type: "output", inputs: {} },
      },
      edges: {},
    }
    const fragment = desugarPath(
      [{ kind: "edge", association: "knows", direction: 0 }],
      { prefix: "p", source: { node: "in", port: "value" } },
    )
    const merged = mergeDesugarIntoGraph(base, fragment)
    expect(merged.nodes.in).toBeDefined()
    expect(merged.nodes.p_traverse_0).toBeDefined()
    expect(base.nodes.p_traverse_0).toBeUndefined()
  })
})

describe("bindSemanticPath", () => {
  test("dependencies asScalar binds without author .id", () => {
    const result = bindSemanticPath(["dependencies"], {
      ontology: fixtureOntology,
      startType: "Feature",
      prefix: "p",
      source: { node: "in", port: "value" },
      asScalar: true,
    })
    expect(result.steps).toHaveLength(1)
    expect(result.steps[0]?.kind).toBe("edge")
    expect(result.nodes.p_project?.inputs.columns).toBe("id")
  })

  test("round-trip desugared path through imp-sql", () => {
    const base: Graph = {
      nodes: {
        in: { id: "in", type: "input", inputs: {} },
        out: { id: "out", type: "output", inputs: {} },
      },
      edges: {},
    }
    const bound = bindSemanticPath(["dependencies", "title"], {
      ontology: fixtureOntology,
      startType: "Feature",
      prefix: "p",
      source: { node: "in", port: "value" },
    })
    const graph = mergeDesugarIntoGraph(base, bound)
    graph.edges.e_out = {
      from: bound.collection,
      to: { node: "out", port: "value" },
    }

    const compiled = compileSqlite(graph, {
      registry: testRegistry(),
      schema: {
        table: "nodes",
        edges: {
          table: "edges",
          sourceColumn: "source_id",
          targetColumn: "target_id",
          typeColumn: "type",
        },
        edgeType: (association, direction) => `${association}:${direction}`,
      },
    })
    const { sql, parameters } = compileSql(compiled)
    expect(sql.toLowerCase()).toContain("join")
    expect(sql.toLowerCase()).toContain("title")
    expect(parameters.includes("01ASSOCDEPEND00000000000001:0")).toBe(true)
  })
})
