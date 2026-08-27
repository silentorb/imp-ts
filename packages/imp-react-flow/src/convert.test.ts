import { describe, expect, test } from "bun:test"
import type { Graph } from "imp-spec"
import { coreNodeLibrary } from "imp-spec"
import { createRegistry, getNodeType, loadLibrary } from "imp-registry"
import { impToReactFlow, reactFlowToImp } from "./convert"

describe("imp ↔ React Flow converters", () => {
  test("round-trips an empty graph", () => {
    const graph: Graph = { nodes: {}, edges: {} }
    const { nodes, edges } = impToReactFlow(graph)
    expect(nodes).toEqual([])
    expect(edges).toEqual([])
    expect(reactFlowToImp(nodes, edges)).toEqual(graph)
  })

  test("round-trips a multi-node graph with input literals and edges", () => {
    const graph: Graph = {
      nodes: {
        a: {
          id: "a",
          type: "literal",
          inputs: { value: 42 },
        },
        b: {
          id: "b",
          type: "filter",
          inputs: { column: "status" },
        },
      },
      edges: {
        e1: {
          from: { node: "a", port: "value" },
          to: { node: "b", port: "predicate" },
        },
      },
    }

    const { nodes, edges } = impToReactFlow(graph)

    expect(nodes).toHaveLength(2)
    expect(edges).toHaveLength(1)

    const nodeA = nodes.find((n) => n.id === "a")
    expect(nodeA?.type).toBe("literal")
    expect(nodeA?.position).toEqual({ x: 0, y: 0 })
    expect(nodeA?.data.inputValues).toEqual({ value: 42 })

    const nodeB = nodes.find((n) => n.id === "b")
    expect(nodeB?.data.inputValues).toEqual({ column: "status" })

    const edge1 = edges.find((e) => e.id === "e1")
    expect(edge1).toMatchObject({
      source: "a",
      sourceHandle: "value",
      target: "b",
      targetHandle: "predicate",
    })

    expect(reactFlowToImp(nodes, edges)).toEqual(graph)
  })

  test("preserves local literals when there are no edges", () => {
    const graph: Graph = {
      nodes: {
        n: {
          id: "n",
          type: "sort",
          inputs: {
            column: "title",
            direction: "asc",
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
          type: "input",
          inputs: {},
        },
        b: {
          id: "b",
          type: "output",
          inputs: {},
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

  test("core library supplies port templates for boundary nodes", () => {
    const registry = loadLibrary(createRegistry(), coreNodeLibrary)
    expect(getNodeType(registry, "input")?.outputs.value?.id).toBe("value")
    expect(getNodeType(registry, "output")?.inputs.value?.id).toBe("value")
  })
})
