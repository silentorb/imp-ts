import { describe, expect, test } from "bun:test"
import type { Graph, ImpFile } from "imp-core-types"
import { resolvedNodes } from "imp-core-types"
import {
  ImpFileParseError,
  assertImpFileSections,
  impFileFromGraph,
  impFileGraphSource,
  parseImpFile,
  parseImpFileJson,
  serializeImpFile,
} from "./index"

const echo = {
  id: "echo",
  inputs: { audio: { id: "audio", type: { param: "A" } } },
  outputs: { audio: { id: "audio", type: { param: "A" } } },
  typeParams: [{ id: "A", bounds: [{ id: "Audio" }] }],
  bindings: { inputs: { audio: "in" }, outputs: { audio: "out" } },
  body: {
    nodes: {
      in: { id: "in", type: "input", inputs: {} },
      out: { id: "out", type: "output", inputs: {} },
    },
    edges: { e1: { from: { node: "in", port: "value" }, to: { node: "out", port: "value" } } },
  },
}

const example = {
  format: "imp",
  id: "example.audio",
  types: [{ id: "Audio", type: { union: [{ id: "audio_mono" }, { id: "audio_stereo" }] } }],
  definitions: [
    echo,
    { id: "sine", inputs: {}, outputs: { audio: { id: "audio", type: { id: "audio_mono" } } } },
  ],
  nodes: [
    { id: "src", type: "sine", inputs: {} },
    { id: "fx", type: "echo", inputs: {} },
  ],
  edges: [{ id: "e1", from: { node: "src", port: "audio" }, to: { node: "fx", port: "audio" } }],
}

function rejects(value: unknown, message: string): void {
  expect(() => parseImpFile(value)).toThrow(ImpFileParseError)
  expect(() => parseImpFile(value)).toThrow(message)
}

describe("parseImpFile", () => {
  test("parses every section, including primitive and graph-backed definitions", () => {
    const file = parseImpFileJson(JSON.stringify(example))
    expect(file.format).toBe("imp")
    expect(file.types?.[0]?.id).toBe("Audio")
    expect(file.definitions?.map((d) => d.id)).toEqual(["echo", "sine"])
    expect(file.nodes?.map((n) => n.id)).toEqual(["src", "fx"])
    expect(file.edges?.[0]?.id).toBe("e1")
  })

  test("an empty object is an empty file; absent sections stay absent", () => {
    expect(parseImpFile({})).toEqual({})
    expect(parseImpFile({ nodes: [] })).toEqual({ nodes: [] })
  })

  test("rejects malformed top-level fields and sections", () => {
    rejects([], "Imp file must be an object")
    rejects({ format: "imp-graph" }, 'format must be "imp"')
    rejects({ id: "" }, "id must be a non-empty string")
    rejects({ nodes: {} }, "nodes must be an array")
  })

  test("rejects malformed and duplicate elements", () => {
    rejects({ nodes: [{ id: "a", inputs: {} }] }, "nodes[0].type")
    rejects({ edges: [{ id: "e", from: { node: "a" }, to: { node: "b", port: "x" } }] }, "edges[0].from.port")
    rejects({ types: [{ id: "T" }] }, "types[0].type must be an object")
    rejects(
      { nodes: [{ id: "a", type: "t", inputs: {} }, { id: "a", type: "t", inputs: {} }] },
      'duplicate nodes id "a"',
    )
  })

  test("validates graph-backed definitions", () => {
    rejects({ definitions: [{ ...echo, implementation: { kind: "universal", id: "x" } }] }, "must not declare implementation")
    rejects({ definitions: [{ ...echo, bindings: undefined }] }, "must include bindings")
    rejects(
      { definitions: [{ ...echo, bindings: { inputs: {}, outputs: { audio: "out" } } }] },
      'missing input binding for port "audio"',
    )
    rejects(
      { definitions: [{ ...echo, bindings: { inputs: { audio: "out" }, outputs: { audio: "out" } } }] },
      'must have type "input"',
    )
    rejects({ definitions: [{ id: "p", inputs: {}, outputs: {}, bindings: { inputs: {}, outputs: {} } }] }, "bindings without a body")
  })
})

describe("Imp file conversions", () => {
  test("serializes in canonical section order, omits empty sections, keeps element order", () => {
    const file = parseImpFile({ nodes: [], ...example, types: [] })
    const text = serializeImpFile(file)
    expect(Object.keys(JSON.parse(text))).toEqual(["format", "id", "definitions", "nodes", "edges"])
    expect(parseImpFileJson(text)).toEqual({ ...file, types: undefined } as unknown as ImpFile)
  })

  test("nodes and edges become a graph source", () => {
    const source = impFileGraphSource(parseImpFile(example))
    expect(resolvedNodes(source).map((n) => n.id)).toEqual(["src", "fx"])
    expect(source.edges.getEdge("e1")?.to).toEqual({ node: "fx", port: "audio" })
  })

  test("a graph round-trips through an Imp file", () => {
    const graph: Graph = {
      nodes: { a: { id: "a", type: "t", inputs: {} } },
      edges: { e: { from: { node: "a", port: "x" }, to: { node: "b", port: "y" } } },
    }
    const file = impFileFromGraph(graph, { format: "imp" })
    expect(file.edges).toEqual([{ id: "e", from: { node: "a", port: "x" }, to: { node: "b", port: "y" } }])
    const source = impFileGraphSource(file)
    expect(source.edges.edgeEntries()).toEqual(Object.entries(graph.edges))
  })

  test("assertImpFileSections rejects sections a slot does not allow", () => {
    const topology = impFileFromGraph({ nodes: {}, edges: {} })
    expect(() => assertImpFileSections(topology, ["nodes", "edges"])).not.toThrow()
    expect(() => assertImpFileSections(parseImpFile(example), ["nodes", "edges"])).toThrow(
      'section "types" is not allowed',
    )
  })
})
