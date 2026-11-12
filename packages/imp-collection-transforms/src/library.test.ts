import { describe, expect, test } from "bun:test"
import { isTypeVar, isUniversalImplementation } from "imp-core-types"
import {
  createRegistry,
  getNodeDefinition,
  getNodeDefinitions,
  loadNodeLibrary,
} from "imp-registry"
import { collectionTransformsLibrary } from "./library"

function defs(id: string) {
  return collectionTransformsLibrary.definitions.filter((entry) => entry.id === id)
}

describe("collectionTransformsLibrary", () => {
  test("has expected identity and transform types", () => {
    expect(collectionTransformsLibrary.id).toBe("imp.collection.transforms")
    const filters = defs("filter")
    expect(filters).toHaveLength(2)
    expect(filters[0]!.typeParams).toEqual([{ id: "T" }])
    expect(filters.map((f) => f.inputs.collection?.type.id).sort()).toEqual(["list", "set"])
    expect(
      filters.map((f) =>
        isUniversalImplementation(f.implementation!) ? f.implementation.id : "",
      ).sort(),
    ).toEqual(["filter_list", "filter_set"])

    const excepts = defs("except")
    expect(excepts).toHaveLength(2)
    expect(excepts.find((e) => e.inputs.collection?.type.id === "list")?.inputs.exclude?.type).toEqual({
      id: "list",
      args: [{ param: "T" }],
    })
    expect(defs("sort")[0]!.inputs.direction?.defaultValue).toBe("asc")
    expect(defs("group")[0]!.inputs.direction?.defaultValue).toBe("asc")
    expect(isTypeVar(filters[0]!.inputs.collection!.type.args![0]!)).toBe(true)
    expect(defs("sort")[0]!.inputs.collection?.type).toEqual({
      id: "list",
      args: [{ param: "T" }],
    })
    expect(defs("limit")[0]!.outputs.collection?.type.id).toBe("list")
    expect(defs("group")[0]!.inputs.column.type.id).toBe("string")
    expect(defs("equals")[0]).toBeDefined()
    expect(defs("not_equals")[0]).toBeDefined()
    expect(defs("less_than")[0]).toBeDefined()
    expect(defs("greater_than")[0]).toBeDefined()
    expect(defs("column")[0]).toBeDefined()
    expect(defs("literal")[0]).toBeDefined()
  })

  test("loads into imp-registry without conflicts", () => {
    const registry = loadNodeLibrary(createRegistry(), collectionTransformsLibrary)
    expect(getNodeDefinition(registry, "filter")).toBeUndefined()
    expect(getNodeDefinitions(registry, "filter")).toHaveLength(2)
    expect(getNodeDefinitions(registry, "except")).toHaveLength(2)
    expect(getNodeDefinition(registry, "equals")?.outputs.value?.type.id).toBe("boolean")
  })
})
