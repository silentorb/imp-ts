import { describe, expect, test } from "bun:test"
import { coreNodeLibrary } from "imp-core-types"
import { collectionTransformsLibrary } from "imp-collection-transforms"
import {
  createRegistry,
  loadGraphLibrary,
  loadNodeLibrary,
} from "imp-registry"
import {
  buildExecutionProgram,
  flattenGraph,
  subgraphKey,
} from "./resolve"

const passthroughLibrary = {
  id: "example.graphs",
  definitions: [
    {
      id: "passthrough",
      inputs: {
        rows: { id: "rows", type: { id: "collection" } },
      },
      outputs: {
        rows: { id: "rows", type: { id: "collection" } },
      },
      bindings: {
        inputs: { rows: "in_rows" },
        outputs: { rows: "out_rows" },
      },
      body: {
        nodes: {
          in_rows: { id: "in_rows", type: "input", inputs: {} },
          out_rows: { id: "out_rows", type: "output", inputs: {} },
        },
        edges: {
          e1: {
            from: { node: "in_rows", port: "value" },
            to: { node: "out_rows", port: "value" },
          },
        },
      },
    },
  ],
}

function buildRegistry() {
  return loadGraphLibrary(
    loadNodeLibrary(
      loadNodeLibrary(createRegistry(), coreNodeLibrary),
      collectionTransformsLibrary,
    ),
    passthroughLibrary,
  )
}

describe("flattenGraph", () => {
  test("expands composite instance into boundary nodes", () => {
    const registry = buildRegistry()
    const graph = {
      nodes: {
        in: { id: "in", type: "input", inputs: {} },
        comp: { id: "comp", type: "passthrough", inputs: {} },
        out: { id: "out", type: "output", inputs: {} },
      },
      edges: {
        e1: { from: { node: "in", port: "value" }, to: { node: "comp", port: "rows" } },
        e2: { from: { node: "comp", port: "rows" }, to: { node: "out", port: "value" } },
      },
    }

    const flat = flattenGraph(graph, registry)
    expect(flat.nodes.comp).toBeUndefined()
    expect(flat.nodes["comp::in_rows"]).toBeUndefined()
    expect(flat.nodes["comp::out_rows"]?.type).toBe("output")
    expect(
      Object.values(flat.edges).some((e) => e.from.node === "in" && e.to.node.startsWith("comp::")),
    ).toBe(true)
    expect(
      Object.values(flat.edges).some((e) => e.from.node.startsWith("comp::") && e.to.node === "out"),
    ).toBe(true)
    expect(flat.nodes["comp::in_rows"]).toBeUndefined()
  })
})

describe("buildExecutionProgram", () => {
  test("deduplicates shared subgraph bodies for diamond references", () => {
    const registry = buildRegistry()
    const graph = {
      nodes: {
        in: { id: "in", type: "input", inputs: {} },
        a: { id: "a", type: "passthrough", inputs: {} },
        b: { id: "b", type: "passthrough", inputs: {} },
        out: { id: "out", type: "output", inputs: {} },
      },
      edges: {
        e1: { from: { node: "in", port: "value" }, to: { node: "a", port: "rows" } },
        e2: { from: { node: "a", port: "rows" }, to: { node: "b", port: "rows" } },
        e3: { from: { node: "b", port: "rows" }, to: { node: "out", port: "value" } },
      },
    }

    const program = buildExecutionProgram(graph, registry)
    expect(program.subgraphs.size).toBe(1)
    expect(program.subgraphs.has(subgraphKey("passthrough", undefined))).toBe(true)
    expect(program.root.nodes.a?.type).toBe("passthrough")
  })
})
