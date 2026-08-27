import { describe, expect, test } from "bun:test"
import { createRegistry, getNodeType, loadLibrary } from "imp-registry"
import { pathingLibrary } from "./library"

describe("pathingLibrary", () => {
  test("has expected identity and traverse type", () => {
    expect(pathingLibrary.id).toBe("imp.pathing")
    expect(pathingLibrary.types.traverse.id).toBe("traverse")
    expect(pathingLibrary.types.traverse.inputs.collection.type.id).toBe("collection")
    expect(pathingLibrary.types.traverse.inputs.association.type.id).toBe("string")
    expect(pathingLibrary.types.traverse.inputs.direction.type.id).toBe("number")
    expect(pathingLibrary.types.traverse.inputs.direction.defaultValue).toBe(0)
    expect(pathingLibrary.types.traverse.inputs.edge_property.type.id).toBe("string")
    expect(pathingLibrary.types.traverse.inputs.edge_property.defaultValue).toBe(null)
    expect(pathingLibrary.types.traverse.inputs.edge_equals.type.id).toBe("any")
    expect(pathingLibrary.types.traverse.inputs.edge_equals.defaultValue).toBe(null)
    expect(pathingLibrary.types.traverse.outputs.collection.type.id).toBe("collection")
  })

  test("loads into imp-registry without conflicts", () => {
    const registry = loadLibrary(createRegistry(), pathingLibrary)
    expect(getNodeType(registry, "traverse")?.outputs.collection?.type.id).toBe("collection")
  })
})
