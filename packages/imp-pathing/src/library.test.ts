import { describe, expect, test } from "bun:test"
import { createRegistry, getNodeType, loadLibrary } from "imp-registry"
import { pathingLibrary } from "./library.ts"

describe("pathingLibrary", () => {
  test("has expected identity and traverse type", () => {
    expect(pathingLibrary.id).toBe("imp.pathing")
    expect(pathingLibrary.types.traverse.id).toBe("traverse")
    expect(pathingLibrary.types.traverse.inputs.collection.type.id).toBe("collection")
    expect(pathingLibrary.types.traverse.inputs.edgeType.type.id).toBe("string")
    expect(pathingLibrary.types.traverse.outputs.collection.type.id).toBe("collection")
  })

  test("loads into imp-registry without conflicts", () => {
    const registry = loadLibrary(createRegistry(), pathingLibrary)
    expect(getNodeType(registry, "traverse")?.outputs.collection?.type.id).toBe("collection")
  })
})
