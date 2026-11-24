import { describe, expect, test } from "bun:test"
import type { Graph } from "./graph"
import {
  graphNodeIds,
  graphSource,
  inboundEdges,
  layeredNodes,
  materializeGraph,
  nodeMapProvider,
  resolvedNodes,
  unresolvedNodeIds,
} from "./graph-source"

const doc: Graph = {
  nodes: {
    a: { id: "a", type: "literal", inputs: {} },
    lone: { id: "lone", type: "literal", inputs: {} },
  },
  edges: {
    e2: { from: { node: "a", port: "value" }, to: { node: "p", port: "items" }, order: 2 },
    e1: { from: { node: "r", port: "value" }, to: { node: "p", port: "items" }, order: 1 },
  },
}

describe("graph sources", () => {
  test("membership is edge endpoints then enumerable node ids", () => {
    expect(graphNodeIds(graphSource(doc))).toEqual(["a", "p", "r", "lone"])
  })

  test("unresolved ids are members the node provider cannot supply", () => {
    expect(unresolvedNodeIds(graphSource(doc))).toEqual(["p", "r"])
  })

  test("layeredNodes resolves in order and enumerates only enumerable providers", () => {
    const remote = { getNode: (id: string) => (id === "r" ? { id, type: "x", inputs: {} } : undefined) }
    const override = nodeMapProvider({ a: { id: "a", type: "override", inputs: {} } })
    const nodes = layeredNodes(override, graphSource(doc).nodes, remote)
    const source = { nodes, edges: graphSource(doc).edges }
    expect(nodes.getNode("a")?.type).toBe("override")
    expect(nodes.getNode("r")?.type).toBe("x")
    expect(nodes.nodeIds?.()).toEqual(["a", "lone"])
    expect(resolvedNodes(source).map((n) => n.id)).toEqual(["a", "r", "lone"])
    expect(layeredNodes(remote).nodeIds).toBeUndefined()
  })

  test("inboundEdges sorts by order", () => {
    expect(inboundEdges(graphSource(doc), "p", "items").map(([id]) => id)).toEqual(["e1", "e2"])
  })

  test("materializeGraph keeps every edge and only resolved nodes", () => {
    const flat = materializeGraph(graphSource(doc))
    expect(Object.keys(flat.nodes)).toEqual(["a", "lone"])
    expect(Object.keys(flat.edges)).toEqual(["e2", "e1"])
  })
})
