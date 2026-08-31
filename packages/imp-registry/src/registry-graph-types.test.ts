import { describe, expect, test } from "bun:test"
import type { GraphTypeLibrary } from "imp-core-types"
import {
  createRegistry,
  getGraphType,
  listGraphTypeLibraries,
  listGraphTypes,
  loadGraphTypeLibrary,
  loadLibrary,
} from "./registry"

const graphTypeLibrary: GraphTypeLibrary = {
  id: "example.graph-types",
  types: {
    passthrough: {
      id: "passthrough",
      typeParams: [{ id: "T" }],
      inputs: {
        rows: {
          id: "rows",
          type: { id: "collection", args: [{ param: "T" }] },
        },
      },
      outputs: {
        rows: {
          id: "rows",
          type: { id: "collection", args: [{ param: "T" }] },
        },
      },
    },
  },
}

const conflictingGraphTypeLibrary: GraphTypeLibrary = {
  id: "example.conflict",
  types: {
    passthrough: {
      id: "passthrough",
      inputs: {},
      outputs: {},
    },
  },
}

describe("imp-registry graph types", () => {
  test("loadGraphTypeLibrary merges graph types", () => {
    const registry = loadGraphTypeLibrary(createRegistry(), graphTypeLibrary)
    expect(getGraphType(registry, "passthrough")?.id).toBe("passthrough")
    expect(listGraphTypes(registry)).toHaveLength(1)
    expect(listGraphTypeLibraries(registry)).toEqual([graphTypeLibrary])
  })

  test("loadGraphTypeLibrary throws on duplicate GraphTypeId", () => {
    const registry = loadGraphTypeLibrary(createRegistry(), graphTypeLibrary)
    expect(() => loadGraphTypeLibrary(registry, conflictingGraphTypeLibrary)).toThrow(
      /GraphTypeId "passthrough" is already registered/,
    )
  })

  test("createRegistry includes empty graph type maps", () => {
    const registry = createRegistry()
    expect(registry.graphTypes).toEqual({})
    expect(registry.graphTypeLibraries).toEqual([])
  })
})
