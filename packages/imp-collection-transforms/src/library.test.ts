import { describe, expect, test } from "bun:test"
import { createRegistry, getNodeType, loadLibrary } from "imp-registry"
import { collectionTransformsLibrary } from "./library"

describe("collectionTransformsLibrary", () => {
  test("has expected identity and transform types", () => {
    expect(collectionTransformsLibrary.id).toBe("imp.collection.transforms")
    expect(collectionTransformsLibrary.types.filter.id).toBe("filter")
    expect(collectionTransformsLibrary.types.except.id).toBe("except")
    expect(collectionTransformsLibrary.types.except.inputs.exclude.type.id).toBe("collection")
    expect(collectionTransformsLibrary.types.sort.inputs.direction?.defaultValue).toBe("asc")
    expect(collectionTransformsLibrary.types.group.inputs.direction?.defaultValue).toBe("asc")
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
    expect(getNodeType(registry, "filter")?.outputs.collection?.type.id).toBe("collection")
    expect(getNodeType(registry, "except")?.inputs.exclude?.type.id).toBe("collection")
    expect(getNodeType(registry, "equals")?.outputs.value?.type.id).toBe("boolean")
  })
})
