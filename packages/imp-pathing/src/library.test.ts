import { describe, expect, test } from "bun:test"
import { createRegistry, getNodeType, loadLibrary } from "imp-registry"
import { pathingLibrary } from "./library"

describe("pathingLibrary", () => {
  test("traverse uses collection<T> ports", () => {
    expect(pathingLibrary.types.traverse.typeParams).toEqual([{ id: "T" }])
    expect(pathingLibrary.types.traverse.inputs.collection.type).toEqual({
      id: "collection",
      args: [{ param: "T" }],
    })
    expect(pathingLibrary.types.traverse.inputs.association.type.id).toBe("string")
    expect(pathingLibrary.types.traverse.inputs.direction.type.id).toBe("number")
    expect(pathingLibrary.types.traverse.inputs.edge_property.type.id).toBe("string")
    expect(pathingLibrary.types.traverse.inputs.edge_equals.type.id).toBe("any")
    expect(pathingLibrary.types.traverse.outputs.collection.type).toEqual({
      id: "collection",
      args: [{ param: "T" }],
    })
  })

  test("loads into imp-registry without conflicts", () => {
    const registry = loadLibrary(createRegistry(), pathingLibrary)
    expect(getNodeType(registry, "traverse")?.outputs.collection?.type).toEqual({
      id: "collection",
      args: [{ param: "T" }],
    })
  })
})
