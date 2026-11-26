import { describe, expect, test } from "bun:test"
import {
  concreteType,
  coreNodeLibrary,
  dispatchImplementation,
  graphSource,
  listOf,
  unionOf,
  type Graph,
  type Node,
  type NodeDefinition,
  type NodeLibrary,
  type Port,
  type Type,
  type TypeDefinition,
} from "imp-core-types"
import { createRegistry, loadNodeLibrary, type Registry } from "imp-registry"
import {
  assignable,
  checkGraph,
  checkGraphDefinitions,
  checkTypeDefinitions,
  formatType,
  normalizeType,
  resolveImplementation,
  resolveTypeArgs,
  unify,
} from "./index"
import { rigidType } from "./substitution"

const mono = concreteType("audio_mono")
const stereo = concreteType("audio_stereo")
const control = concreteType("control")
const audio = concreteType("Audio")
const a: Type = { param: "A" }

const audioTypes: TypeDefinition[] = [
  { id: "Audio", type: unionOf(mono, stereo) },
  { id: "Pair", params: [{ id: "T" }], type: listOf({ param: "T" }) },
]

function port(id: string, type: Type): Port {
  return { id, type }
}

function def(
  id: string,
  inputs: Port[],
  outputs: Port[],
  extra: Partial<NodeDefinition> = {},
): NodeDefinition {
  return {
    id,
    inputs: Object.fromEntries(inputs.map((p) => [p.id, p])),
    outputs: Object.fromEntries(outputs.map((p) => [p.id, p])),
    ...extra,
  }
}

const aBoundAudio = { typeParams: [{ id: "A", bounds: [audio] }] }

const audioLibrary: NodeLibrary = {
  id: "example.audio",
  types: audioTypes,
  definitions: [
    def("mono_source", [], [port("audio", mono)]),
    def("stereo_source", [], [port("audio", stereo)]),
    def("audio_source", [], [port("audio", audio)]),
    def("mono_sink", [port("audio", mono)], []),
    def("audio_sink", [port("audio", audio)], []),
    def("control_source", [], [port("value", control)]),
    def("gain", [port("audio", a), port("amount", control)], [port("audio", a)], aBoundAudio),
    def("mix", [port("a", a), port("b", a)], [port("audio", a)], aBoundAudio),
    def("render", [port("audio", a)], [], {
      ...aBoundAudio,
      implementation: dispatchImplementation(
        [
          { match: mono, implementation: "render_mono" },
          { match: audio, implementation: "render_any_audio" },
        ],
        { paramIndex: 0 },
      ),
    }),
  ],
}

function registry(types: TypeDefinition[] = []): Registry {
  let registry = loadNodeLibrary(createRegistry(), coreNodeLibrary)
  registry = loadNodeLibrary(registry, audioLibrary)
  return types.length ? loadNodeLibrary(registry, { id: "extra", definitions: [], types }) : registry
}

function graph(nodes: [string, string][], edges: [string, string, string, string][]): Graph {
  const nodeMap: Record<string, Node> = {}
  for (const [id, type] of nodes) nodeMap[id] = { id, type, inputs: {} }
  const edgeMap: Graph["edges"] = {}
  edges.forEach(([from, fromPort, to, toPort], i) => {
    edgeMap[`e${i}`] = { from: { node: from, port: fromPort }, to: { node: to, port: toPort } }
  })
  return { nodes: nodeMap, edges: edgeMap }
}

function messages(g: Graph, reg = registry()): string[] {
  return checkGraph(graphSource(g), reg).map((error) => error.message)
}

describe("normalizeType", () => {
  const reg = registry([
    { id: "Nested", type: unionOf(audio, unionOf(mono, control)) },
    { id: "Loop", type: concreteType("Loop") },
  ])

  test("expands defined names and generic definitions", () => {
    expect(normalizeType(audio, reg)).toEqual(unionOf(mono, stereo))
    expect(normalizeType(concreteType("Pair", mono), reg)).toEqual(listOf(mono))
  })

  test("flattens, dedupes and collapses unions", () => {
    expect(normalizeType(concreteType("Nested"), reg)).toEqual(unionOf(mono, stereo, control))
    expect(normalizeType(unionOf(mono, mono), reg)).toEqual(mono)
    expect(normalizeType(unionOf(mono, concreteType("any")), reg)).toEqual(concreteType("any"))
  })

  test("leaves undefined names opaque and cyclic names unexpanded", () => {
    expect(normalizeType(concreteType("score"), reg)).toEqual(concreteType("score"))
    expect(normalizeType(concreteType("Loop"), reg)).toEqual(concreteType("Loop"))
  })
})

describe("union assignability", () => {
  const union = unionOf(mono, stereo)

  test("a member flows into the union; the union flows only where every member fits", () => {
    expect(assignable(mono, union).ok).toBe(true)
    expect(assignable(control, union).ok).toBe(false)
    expect(assignable(union, unionOf(mono, stereo, control)).ok).toBe(true)
    expect(assignable(union, mono).ok).toBe(false)
  })

  test("variables bind to the whole union in either direction", () => {
    const into = assignable(a, union)
    expect(into.ok && formatType(into.subst.get("A")!)).toBe("audio_mono | audio_stereo")
    const from = assignable(union, a)
    expect(from.ok && formatType(from.subst.get("A")!)).toBe("audio_mono | audio_stereo")
  })

  test("different bindings through different members are ambiguous", () => {
    const target = unionOf(listOf(concreteType("string")), listOf(concreteType("number")))
    const result = assignable(listOf({ param: "T" }), target)
    expect(result.ok).toBe(false)
    expect(!result.ok && result.message).toContain("ambiguous")
  })

  test("unions are equal regardless of member order", () => {
    expect(unify(unionOf(mono, stereo), unionOf(stereo, mono)).ok).toBe(true)
    expect(unify(unionOf(mono, stereo), mono).ok).toBe(false)
  })

  test("a rigid parameter flows into types its bounds fit", () => {
    const rigid = rigidType("A", [union])
    expect(assignable(rigid, union).ok).toBe(true)
    expect(assignable(rigid, mono).ok).toBe(false)
  })
})

describe("union-typed ports in graphs", () => {
  test("a union port accepts any member", () => {
    expect(messages(graph([["s", "mono_source"], ["k", "audio_sink"]], [["s", "audio", "k", "audio"]]))).toEqual([])
  })

  test("a union output cannot feed a port that takes one member", () => {
    const errors = messages(graph([["s", "audio_source"], ["k", "mono_sink"]], [["s", "audio", "k", "audio"]]))
    expect(errors.some((m) => m.includes("audio_mono | audio_stereo"))).toBe(true)
  })

  test("an edge into a union port does not decide an inferred parameter", () => {
    const g = graph(
      [["s", "mono_source"], ["c", "control_source"], ["g", "gain"], ["k", "audio_sink"]],
      [["s", "audio", "g", "audio"], ["c", "value", "g", "amount"], ["g", "audio", "k", "audio"]],
    )
    const reg = registry()
    expect(messages(g, reg)).toEqual([])
    expect(resolveTypeArgs(graphSource(g), "g", reg)).toEqual([mono])
  })

  test("a parameter only a union port constrains takes the whole union and satisfies its bound", () => {
    const g = graph([["s", "audio_source"], ["g", "gain"], ["c", "control_source"]], [
      ["s", "audio", "g", "audio"],
      ["c", "value", "g", "amount"],
    ])
    const reg = registry()
    expect(messages(g, reg)).toEqual([])
    expect(resolveTypeArgs(graphSource(g), "g", reg)).toEqual([unionOf(mono, stereo)])
  })

  test("bounds by a named union reject non-members", () => {
    const g = graph([["c", "control_source"], ["d", "control_source"], ["m", "mix"]], [
      ["c", "value", "m", "a"],
      ["d", "value", "m", "b"],
    ])
    expect(messages(g).some((m) => m.includes("does not satisfy bound audio_mono | audio_stereo"))).toBe(true)
  })

  test("mixed layouts into one parameter still conflict", () => {
    const g = graph([["s", "mono_source"], ["t", "stereo_source"], ["m", "mix"]], [
      ["s", "audio", "m", "a"],
      ["t", "audio", "m", "b"],
    ])
    expect(messages(g).length).toBeGreaterThan(0)
  })

  test("dispatch patterns match by assignability, including named unions", () => {
    const reg = registry()
    const monoGraph = graph([["s", "mono_source"], ["r", "render"]], [["s", "audio", "r", "audio"]])
    expect(resolveImplementation(graphSource(monoGraph), "r", reg)).toBe("render_mono")
    const stereoGraph = graph([["s", "stereo_source"], ["r", "render"]], [["s", "audio", "r", "audio"]])
    expect(resolveImplementation(graphSource(stereoGraph), "r", reg)).toBe("render_any_audio")
  })
})

describe("checkTypeDefinitions", () => {
  function errorsFor(types: TypeDefinition[], extra: NodeDefinition[] = []): string[] {
    const reg = loadNodeLibrary(createRegistry(), { id: "t", definitions: extra, types })
    return checkTypeDefinitions(reg).map((error) => error.message)
  }

  test("accepts valid definitions", () => {
    expect(errorsFor(audioTypes)).toEqual([])
  })

  test("reports undeclared params, arity and empty unions", () => {
    const errors = errorsFor([
      ...audioTypes,
      { id: "Free", type: listOf({ param: "X" }) },
      { id: "BadArity", type: concreteType("Pair") },
      { id: "Empty", type: { union: [] } },
    ])
    expect(errors.some((m) => m.includes('undeclared type parameter "X"'))).toBe(true)
    expect(errors.some((m) => m.includes('"Pair" expects 1 type arguments, got 0'))).toBe(true)
    expect(errors.some((m) => m.includes("at least one member"))).toBe(true)
  })

  test("reports direct and indirect cycles", () => {
    const errors = errorsFor([
      { id: "Self", type: listOf(concreteType("Self")) },
      { id: "Ping", type: unionOf(mono, concreteType("Pong")) },
      { id: "Pong", type: concreteType("Ping") },
    ])
    expect(errors.some((m) => m.includes('"Self" refers to itself'))).toBe(true)
    expect(errors.some((m) => m.includes('"Ping" refers to itself'))).toBe(true)
    expect(errors.some((m) => m.includes('"Pong" refers to itself'))).toBe(true)
  })

  test("reports bad references in node definitions and runs from checkGraphDefinitions", () => {
    const errors = errorsFor(audioTypes, [def("bad", [port("x", concreteType("Pair"))], [])])
    expect(errors).toContain('type "Pair" expects 1 type arguments, got 0')
    const reg = loadNodeLibrary(createRegistry(), {
      id: "t",
      definitions: [],
      types: [{ id: "Self", type: concreteType("Self") }],
    })
    expect(checkGraphDefinitions(reg).some((e) => e.typeId === "Self")).toBe(true)
  })

  test("duplicate type ids are rejected at load", () => {
    expect(() => registry([{ id: "Audio", type: mono }])).toThrow('TypeId "Audio" is already defined')
  })
})
