import { describe, expect, test } from "bun:test"
import {
  coreNodeLibrary,
  graphSource,
  type Edge,
  type Graph,
  type Node,
  type NodeDefinition,
  type Port,
  type Type,
} from "imp-core-types"
import { createRegistry, loadNodeLibrary, loadTypeConstraintLibrary } from "imp-registry"
import { checkDefinition, checkGraph, resolveTypeArgs } from "./index"

const number: Type = { id: "number" }
const string: Type = { id: "string" }
const a: Type = { param: "A" }

function port(id: string, type: Type, variadic = false): Port {
  return variadic ? { id, type, variadic } : { id, type }
}

function definition(
  id: string,
  bound: string | undefined,
  inputs: Port[],
  outputs: Port[],
): NodeDefinition {
  return {
    id,
    ...(bound ? { typeParams: [{ id: "A", bounds: [bound] }] } : {}),
    inputs: Object.fromEntries(inputs.map((entry) => [entry.id, entry])),
    outputs: Object.fromEntries(outputs.map((entry) => [entry.id, entry])),
  }
}

/** `Scalar = number | string`; `Numeric = number`. */
function registry() {
  let registry = loadNodeLibrary(createRegistry(), coreNodeLibrary)
  registry = loadTypeConstraintLibrary(registry, {
    id: "example.constraints",
    constraints: {
      Scalar: { id: "Scalar", members: [number, string] },
      Numeric: { id: "Numeric", members: [number] },
    },
  })
  return loadNodeLibrary(registry, {
    id: "example.generic",
    definitions: [
      definition("number_source", undefined, [], [port("value", number)]),
      definition("string_source", undefined, [], [port("value", string)]),
      definition("mix", "Scalar", [port("a", a), port("b", a)], [port("value", a)]),
      definition("sum", "Scalar", [port("inputs", a, true)], [port("value", a)]),
      definition("numeric_only", "Numeric", [port("value", a)], [port("value", a)]),
      definition("seeded", undefined, [port("seed", { id: "any" })], [port("value", number)]),
    ],
  })
}

function node(id: string, type: string, typeArgs?: Type[]): [string, Node] {
  return [id, { id, type, inputs: {}, ...(typeArgs ? { typeArgs } : {}) }]
}

function edge(id: string, from: [string, string], to: [string, string], order?: number): [string, Edge] {
  return [
    id,
    {
      from: { node: from[0], port: from[1] },
      to: { node: to[0], port: to[1] },
      ...(order === undefined ? {} : { order }),
    },
  ]
}

function graph(nodes: [string, Node][], edges: [string, Edge][]): Graph {
  return { nodes: Object.fromEntries(nodes), edges: Object.fromEntries(edges) }
}

function messages(value: Graph, reg = registry()): string[] {
  return checkGraph(graphSource(value), reg).map((error) => error.message)
}

function mixGraph(aSource: string, bSource: string): Graph {
  return graph(
    [node("x", aSource), node("y", bSource), node("mix", "mix"), node("out", "output")],
    [
      edge("e1", ["x", "value"], ["mix", "a"]),
      edge("e2", ["y", "value"], ["mix", "b"]),
      edge("e3", ["mix", "value"], ["out", "value"]),
    ],
  )
}

describe("generic inference", () => {
  test("matching inputs resolve the parameter", () => {
    const reg = registry()
    for (const [source, expected] of [
      ["number_source", number],
      ["string_source", string],
    ] as const) {
      const value = mixGraph(source, source)
      expect(messages(value, reg)).toEqual([])
      expect(resolveTypeArgs(graphSource(value), "mix", reg)).toEqual([expected])
    }
  })

  test("mismatched inputs report a type parameter conflict", () => {
    expect(messages(mixGraph("number_source", "string_source"))).toEqual([
      "type parameter A is number (from input a) but input b receives string",
    ])
  })

  test("mismatched variadic inputs report a type parameter conflict", () => {
    const errors = messages(
      graph(
        [node("x", "number_source"), node("y", "string_source"), node("sum", "sum"), node("out", "output")],
        [
          edge("e1", ["x", "value"], ["sum", "inputs"], 0),
          edge("e2", ["y", "value"], ["sum", "inputs"], 1),
          edge("e3", ["sum", "value"], ["out", "value"]),
        ],
      ),
    )
    expect(errors).toHaveLength(1)
    expect(errors[0]).toStartWith("type parameter A is ")
  })

  test("an any target does not decide a parameter", () => {
    const withSeed = (value: Graph): Graph => ({
      nodes: { ...value.nodes, ...Object.fromEntries([node("noise", "seeded")]) },
      // The `any` edge id sorts first so it would be applied first without deferral.
      edges: { ...Object.fromEntries([edge("a0", ["mix", "value"], ["noise", "seed"])]), ...value.edges },
    })
    const errors = messages(withSeed(mixGraph("number_source", "string_source")))
    expect(errors).toHaveLength(1)
    expect(errors[0]).toContain("type parameter A")

    const reg = registry()
    const ok = withSeed(mixGraph("number_source", "number_source"))
    expect(messages(ok, reg)).toEqual([])
    expect(resolveTypeArgs(graphSource(ok), "mix", reg)).toEqual([number])
  })

  test("explicit type args keep variadic ports", () => {
    expect(
      messages(
        graph(
          [node("x", "number_source"), node("y", "number_source"), node("sum", "sum", [number]), node("out", "output")],
          [
            edge("e1", ["x", "value"], ["sum", "inputs"], 0),
            edge("e2", ["y", "value"], ["sum", "inputs"], 1),
            edge("e3", ["sum", "value"], ["out", "value"]),
          ],
        ),
      ),
    ).toEqual([])
  })
})

/** `chain<A: bound>(a: A, b: A) → A` whose body runs `inner` on `mix(a, b)`. */
function genericChain(bound: string, inner: string, innerPort: string): NodeDefinition {
  return {
    ...definition("chain", bound, [port("a", a), port("b", a)], [port("value", a)]),
    body: graph(
      [node("in_a", "input"), node("in_b", "input"), node("mix", "mix"), node("inner", inner), node("out", "output")],
      [
        edge("e1", ["in_a", "value"], ["mix", "a"]),
        edge("e2", ["in_b", "value"], ["mix", "b"]),
        edge("e3", ["mix", "value"], ["inner", innerPort], 0),
        edge("e4", ["inner", "value"], ["out", "value"]),
      ],
    ),
    bindings: { inputs: { a: "in_a", b: "in_b" }, outputs: { value: "out" } },
  }
}

describe("generic chains", () => {
  test("every node of a long generic chain resolves", () => {
    const reg = registry()
    const nodes: [string, Node][] = [node("src", "number_source"), node("out", "output")]
    const edges: [string, Edge][] = []
    let previous = "src"
    for (let index = 0; index < 12; index++) {
      const id = `n${index}`
      nodes.push(node(id, "numeric_only"))
      edges.push(edge(`e${index}`, [previous, "value"], [id, "value"]))
      previous = id
    }
    edges.push(edge("last", [previous, "value"], ["out", "value"]))
    const value = graph(nodes, edges)
    expect(messages(value, reg)).toEqual([])
    for (let index = 0; index < 12; index++) {
      expect(resolveTypeArgs(graphSource(value), `n${index}`, reg)).toEqual([number])
    }
  })
})

describe("generic graph-backed definitions", () => {
  test("the body checks with rigid parameters", () => {
    expect(checkDefinition(genericChain("Scalar", "sum", "inputs"), registry())).toEqual([])
  })

  test("a concrete use of a parameter is rejected", () => {
    const chain = genericChain("Scalar", "sum", "inputs")
    const body = chain.body!
    const rewired: NodeDefinition = {
      ...chain,
      body: {
        nodes: { ...body.nodes, ...Object.fromEntries([node("noise", "seeded")]) },
        edges: { ...body.edges, ...Object.fromEntries([edge("e4", ["noise", "value"], ["out", "value"])]) },
      },
    }
    const errors = checkDefinition(rewired, registry()).map((error) => error.message)
    expect(errors.some((message) => message.includes("number") && message.includes("A"))).toBe(true)
  })

  test("parameter bounds must imply inner bounds", () => {
    const reg = registry()
    expect(checkDefinition(genericChain("Numeric", "numeric_only", "value"), reg)).toEqual([])
    const errors = checkDefinition(genericChain("Scalar", "numeric_only", "value"), reg).map(
      (error) => error.message,
    )
    expect(errors).toContain('type argument A does not satisfy bound "Numeric"')
  })
})
