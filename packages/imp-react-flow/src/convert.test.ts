import { describe, expect, test } from "bun:test"
import type { Graph } from "imp-spec"
import { impToReactFlow, reactFlowToImp } from "./convert.ts"

describe("imp ↔ React Flow converters", () => {
  test("round-trips an empty graph", () => {
    const graph: Graph = { nodes: {}, edges: {} }
    const { nodes, edges } = impToReactFlow(graph)
    expect(nodes).toEqual([])
    expect(edges).toEqual([])
    expect(reactFlowToImp(nodes, edges)).toEqual(graph)
  })

  test("round-trips a multi-node multi-port graph", () => {
    const graph: Graph = {
      nodes: {
        a: {
          id: "a",
          type: "source",
          inputs: {},
          outputs: {
            out: { id: "out", type: { id: "float" } },
            gate: { id: "gate", type: { id: "bool" } },
          },
        },
        b: {
          id: "b",
          type: "sink",
          inputs: {
            in: { id: "in", type: { id: "float" } },
            enable: { id: "enable", type: { id: "bool" } },
          },
          outputs: {},
        },
      },
      edges: {
        e1: {
          from: { node: "a", port: "out" },
          to: { node: "b", port: "in" },
        },
        e2: {
          from: { node: "a", port: "gate" },
          to: { node: "b", port: "enable" },
        },
      },
    }

    const { nodes, edges } = impToReactFlow(graph)

    expect(nodes).toHaveLength(2)
    expect(edges).toHaveLength(2)

    const nodeA = nodes.find((n) => n.id === "a")
    expect(nodeA?.type).toBe("source")
    expect(nodeA?.position).toEqual({ x: 0, y: 0 })
    expect(nodeA?.data.outputs.out.type.id).toBe("float")
    expect(nodeA?.data.outputs.gate.type.id).toBe("bool")

    const edge1 = edges.find((e) => e.id === "e1")
    expect(edge1).toMatchObject({
      source: "a",
      sourceHandle: "out",
      target: "b",
      targetHandle: "in",
    })

    expect(reactFlowToImp(nodes, edges)).toEqual(graph)
  })

  test("preserves unused ports that have no edges", () => {
    const graph: Graph = {
      nodes: {
        n: {
          id: "n",
          type: "passthrough",
          inputs: {
            unusedIn: { id: "unusedIn", type: { id: "string" } },
          },
          outputs: {
            unusedOut: { id: "unusedOut", type: { id: "string" } },
          },
        },
      },
      edges: {},
    }

    const { nodes, edges } = impToReactFlow(graph)
    expect(reactFlowToImp(nodes, edges)).toEqual(graph)
  })

  test("reactFlowToImp requires sourceHandle and targetHandle", () => {
    const { nodes } = impToReactFlow({
      nodes: {
        a: {
          id: "a",
          type: "a",
          inputs: {},
          outputs: { out: { id: "out", type: { id: "t" } } },
        },
        b: {
          id: "b",
          type: "b",
          inputs: { in: { id: "in", type: { id: "t" } } },
          outputs: {},
        },
      },
      edges: {},
    })

    expect(() =>
      reactFlowToImp(nodes, [
        { id: "bad", source: "a", target: "b" },
      ]),
    ).toThrow(/sourceHandle/)
  })
})
