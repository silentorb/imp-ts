import { describe, expect, test } from "bun:test"
import type { NodeLibrary } from "imp-core-types"
import {
  createRegistry,
  getNodeDefinition,
  listLibraries,
  listNodeDefinitions,
  loadGraphLibrary,
  loadNodeLibrary,
} from "./registry"

const sourceLibrary: NodeLibrary = {
  id: "example.source",
  definitions: [
    {
      id: "source",
      inputs: {},
      outputs: {
        out: { id: "out", type: { id: "signal" } },
      },
    },
  ],
}

const sinkLibrary: NodeLibrary = {
  id: "example.sink",
  definitions: [
    {
      id: "sink",
      inputs: {
        in: { id: "in", type: { id: "signal" } },
      },
      outputs: {},
    },
  ],
}

const conflictingLibrary: NodeLibrary = {
  id: "example.conflict",
  definitions: [
    {
      id: "source",
      inputs: {},
      outputs: {},
    },
  ],
}

const graphLibrary = {
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

describe("imp-registry", () => {
  test("empty registry has no definitions or libraries", () => {
    const registry = createRegistry()
    expect(listNodeDefinitions(registry)).toEqual([])
    expect(listLibraries(registry)).toEqual([])
    expect(getNodeDefinition(registry, "source")).toBeUndefined()
  })

  test("loadNodeLibrary merges definitions and preserves libraries in order", () => {
    const registry = loadNodeLibrary(
      loadNodeLibrary(createRegistry(), sourceLibrary),
      sinkLibrary,
    )

    expect(getNodeDefinition(registry, "source")).toEqual(sourceLibrary.definitions[0])
    expect(getNodeDefinition(registry, "sink")).toEqual(sinkLibrary.definitions[0])
    expect(listNodeDefinitions(registry)).toEqual([
      sourceLibrary.definitions[0],
      sinkLibrary.definitions[0],
    ])
    expect(listLibraries(registry)).toEqual([sourceLibrary, sinkLibrary])
  })

  test("loadGraphLibrary merges graph-backed definitions", () => {
    const registry = loadGraphLibrary(createRegistry(), graphLibrary)
    expect(getNodeDefinition(registry, "passthrough")?.body?.nodes.in_rows?.type).toBe("input")
  })

  test("loadNodeLibrary throws on duplicate NodeTypeId", () => {
    const registry = loadNodeLibrary(createRegistry(), sourceLibrary)
    expect(() => loadNodeLibrary(registry, conflictingLibrary)).toThrow(
      /NodeTypeId "source" is already registered/,
    )
  })

  test("loadNodeLibrary does not mutate the previous registry", () => {
    const empty = createRegistry()
    const withSource = loadNodeLibrary(empty, sourceLibrary)

    expect(listNodeDefinitions(empty)).toEqual([])
    expect(listLibraries(empty)).toEqual([])
    expect(listNodeDefinitions(withSource)).toHaveLength(1)
  })
})
