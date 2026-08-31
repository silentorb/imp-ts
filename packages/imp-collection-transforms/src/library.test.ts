import { describe, expect, test } from "bun:test"
import { isTypeVar } from "imp-core-types"
import { createRegistry, getNodeType, loadLibrary } from "imp-registry"
import { collectionTransformsLibrary } from "./library"

describe("collectionTransformsLibrary", () => {
  test("has expected identity and transform types", () => {
    expect(collectionTransformsLibrary.id).toBe("imp.collection.transforms")
    expect(collectionTransformsLibrary.types.filter.id).toBe("filter")
    expect(collectionTransformsLibrary.types.filter.typeParams).toEqual([{ id: "T" }])
    expect(collectionTransformsLibrary.types.except.id).toBe("except")
    expect(
      collectionTransformsLibrary.types.except.inputs.exclude?.type,
    ).toEqual({ id: "collection", args: [{ param: "T" }] })
    expect(collectionTransformsLibrary.types.sort.inputs.direction?.defaultValue).toBe("asc")
    expect(collectionTransformsLibrary.types.group.inputs.direction?.defaultValue).toBe("asc")
    expect(isTypeVar(collectionTransformsLibrary.types.filter.inputs.collection!.type.args![0]!)).toBe(true)
    expect(collectionTransformsLibrary.types.group.inputs.column.type.id).toBe("string")
    expect(collectionTransformsLibrary.types.equals).toBeDefined()
    expect(collectionTransformsLibrary.types.not_equals).toBeDefined()
    expect(collectionTransformsLibrary.types.less_than).toBeDefined()
    expect(collectionTransformsLibrary.types.greater_than).toBeDefined()
    expect(collectionTransformsLibrary.types.column).toBeDefined()
    expect(collectionTransformsLibrary.types.literal).toBeDefined()
  })

  test("loads into imp-registry without conflicts", () => {
    const registry = loadLibrary(createRegistry(), collectionTransformsLibrary)
    const filter = getNodeType(registry, "filter")
    expect(filter?.outputs.collection?.type).toEqual({
      id: "collection",
      args: [{ param: "T" }],
    })
    expect(getNodeType(registry, "except")?.inputs.exclude?.type).toEqual({
      id: "collection",
      args: [{ param: "T" }],
    })
    expect(getNodeType(registry, "equals")?.outputs.value?.type.id).toBe("boolean")
  })
})
