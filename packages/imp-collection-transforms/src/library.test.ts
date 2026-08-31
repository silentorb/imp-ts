import { describe, expect, test } from "bun:test"
import { isTypeVar } from "imp-core-types"
import { createRegistry, getNodeDefinition, loadNodeLibrary } from "imp-registry"
import { collectionTransformsLibrary } from "./library"

function def(id: string) {
  return collectionTransformsLibrary.definitions.find((entry) => entry.id === id)!
}

describe("collectionTransformsLibrary", () => {
  test("has expected identity and transform types", () => {
    expect(collectionTransformsLibrary.id).toBe("imp.collection.transforms")
    expect(def("filter").id).toBe("filter")
    expect(def("filter").typeParams).toEqual([{ id: "T" }])
    expect(def("except").id).toBe("except")
    expect(def("except").inputs.exclude?.type).toEqual({
      id: "collection",
      args: [{ param: "T" }],
    })
    expect(def("sort").inputs.direction?.defaultValue).toBe("asc")
    expect(def("group").inputs.direction?.defaultValue).toBe("asc")
    expect(isTypeVar(def("filter").inputs.collection!.type.args![0]!)).toBe(true)
    expect(def("group").inputs.column.type.id).toBe("string")
    expect(def("equals")).toBeDefined()
    expect(def("not_equals")).toBeDefined()
    expect(def("less_than")).toBeDefined()
    expect(def("greater_than")).toBeDefined()
    expect(def("column")).toBeDefined()
    expect(def("literal")).toBeDefined()
  })

  test("loads into imp-registry without conflicts", () => {
    const registry = loadNodeLibrary(createRegistry(), collectionTransformsLibrary)
    const filter = getNodeDefinition(registry, "filter")
    expect(filter?.outputs.collection?.type).toEqual({
      id: "collection",
      args: [{ param: "T" }],
    })
    expect(getNodeDefinition(registry, "except")?.inputs.exclude?.type).toEqual({
      id: "collection",
      args: [{ param: "T" }],
    })
    expect(getNodeDefinition(registry, "equals")?.outputs.value?.type.id).toBe("boolean")
  })
})
