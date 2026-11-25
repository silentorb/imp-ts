import { describe, expect, test } from "bun:test"
import { coreNodeLibrary, graphSource, type Graph, type Type } from "imp-core-types"
import {
  createRegistry,
  loadGraphLibrary,
  loadNodeLibrary,
  loadTypeConstraintLibrary,
} from "imp-registry"
import { checkDefinition, checkGraph, resolveTypeArgs } from "imp-typecheck"
import { flattenGraph } from "./resolve"

const number: Type = { id: "number" }
const string: Type = { id: "string" }
const a: Type = { param: "A" }
const typeParams = [{ id: "A", bounds: ["Scalar"] }]

/** `twice<A: Scalar>(value: A) → A` = `mix(value, value)`. */
const twice = {
  id: "twice",
  typeParams,
  inputs: { value: { id: "value", type: a } },
  outputs: { value: { id: "value", type: a } },
  bindings: { inputs: { value: "in" }, outputs: { value: "out" } },
  body: {
    nodes: {
      in: { id: "in", type: "input", inputs: {} },
      mix: { id: "mix", type: "mix", inputs: {} },
      out: { id: "out", type: "output", inputs: {} },
    },
    edges: {
      e1: { from: { node: "in", port: "value" }, to: { node: "mix", port: "a" } },
      e2: { from: { node: "in", port: "value" }, to: { node: "mix", port: "b" } },
      e3: { from: { node: "mix", port: "value" }, to: { node: "out", port: "value" } },
    },
  },
}

function registry() {
  let registry = loadNodeLibrary(createRegistry(), coreNodeLibrary)
  registry = loadTypeConstraintLibrary(registry, {
    id: "example.constraints",
    constraints: { Scalar: { id: "Scalar", members: [number, string] } },
  })
  registry = loadNodeLibrary(registry, {
    id: "example.primitives",
    definitions: [
      { id: "number_source", inputs: {}, outputs: { value: { id: "value", type: number } } },
      { id: "string_source", inputs: {}, outputs: { value: { id: "value", type: string } } },
      {
        id: "mix",
        typeParams,
        inputs: { a: { id: "a", type: a }, b: { id: "b", type: a } },
        outputs: { value: { id: "value", type: a } },
      },
    ],
  })
  return loadGraphLibrary(registry, { id: "example.graphs", definitions: [twice] })
}

function useSite(source: string): Graph {
  return {
    nodes: {
      src: { id: "src", type: source, inputs: {} },
      t: { id: "t", type: "twice", inputs: {} },
      out: { id: "out", type: "output", inputs: {} },
    },
    edges: {
      e1: { from: { node: "src", port: "value" }, to: { node: "t", port: "value" } },
      e2: { from: { node: "t", port: "value" }, to: { node: "out", port: "value" } },
    },
  }
}

describe("generic graph-backed definitions", () => {
  test("flatten infers body types from the use site", () => {
    const reg = registry()
    expect(checkDefinition(twice, reg)).toEqual([])
    for (const [source, expected] of [
      ["number_source", number],
      ["string_source", string],
    ] as const) {
      const value = useSite(source)
      expect(checkGraph(graphSource(value), reg)).toEqual([])
      const flat = flattenGraph(graphSource(value), reg)
      expect(checkGraph(graphSource(flat), reg)).toEqual([])
      expect(resolveTypeArgs(graphSource(flat), "t::mix", reg)).toEqual([expected])
    }
  })
})
