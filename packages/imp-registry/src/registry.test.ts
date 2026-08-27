import { describe, expect, test } from "bun:test"
import type { NodeLibrary } from "imp-spec"
import {
  createRegistry,
  getNodeType,
  listLibraries,
  listNodeTypes,
  loadLibrary,
} from "./registry"

const sourceLibrary: NodeLibrary = {
  id: "example.source",
  types: {
    source: {
      id: "source",
      inputs: {},
      outputs: {
        out: { id: "out", type: { id: "signal" } },
      },
    },
  },
}

const sinkLibrary: NodeLibrary = {
  id: "example.sink",
  types: {
    sink: {
      id: "sink",
      inputs: {
        in: { id: "in", type: { id: "signal" } },
      },
      outputs: {},
    },
  },
}

const conflictingLibrary: NodeLibrary = {
  id: "example.conflict",
  types: {
    source: {
      id: "source",
      inputs: {},
      outputs: {},
    },
  },
}

describe("imp-registry", () => {
  test("empty registry has no types or libraries", () => {
    const registry = createRegistry()
    expect(listNodeTypes(registry)).toEqual([])
    expect(listLibraries(registry)).toEqual([])
    expect(getNodeType(registry, "source")).toBeUndefined()
  })

  test("loadLibrary merges types and preserves libraries in order", () => {
    const registry = loadLibrary(
      loadLibrary(createRegistry(), sourceLibrary),
      sinkLibrary,
    )

    expect(getNodeType(registry, "source")).toEqual(sourceLibrary.types.source)
    expect(getNodeType(registry, "sink")).toEqual(sinkLibrary.types.sink)
    expect(listNodeTypes(registry)).toEqual([
      sourceLibrary.types.source,
      sinkLibrary.types.sink,
    ])
    expect(listLibraries(registry)).toEqual([sourceLibrary, sinkLibrary])
  })

  test("loadLibrary throws on duplicate NodeTypeId", () => {
    const registry = loadLibrary(createRegistry(), sourceLibrary)
    expect(() => loadLibrary(registry, conflictingLibrary)).toThrow(
      /NodeTypeId "source" is already registered/,
    )
  })

  test("loadLibrary does not mutate the previous registry", () => {
    const empty = createRegistry()
    const withSource = loadLibrary(empty, sourceLibrary)

    expect(listNodeTypes(empty)).toEqual([])
    expect(listLibraries(empty)).toEqual([])
    expect(listNodeTypes(withSource)).toHaveLength(1)
  })
})
