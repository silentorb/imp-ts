import { describe, expect, test } from "bun:test"
import { createRegistry, getNodeDefinition, loadNodeLibrary } from "imp-registry"
import { pathingLibrary } from "./library"

function def(id: string) {
  return pathingLibrary.definitions.find((entry) => entry.id === id)!
}

describe("pathingLibrary", () => {
  test("traverse uses collection<T> ports", () => {
    expect(def("traverse").typeParams).toEqual([{ id: "T" }])
    expect(def("traverse").inputs.collection.type).toEqual({
      id: "collection",
      args: [{ param: "T" }],
    })
    expect(def("traverse").inputs.association.type.id).toBe("string")
    expect(def("traverse").inputs.direction.type.id).toBe("number")
    expect(def("traverse").inputs.edge_property.type.id).toBe("string")
    expect(def("traverse").inputs.edge_equals.type.id).toBe("any")
    expect(def("traverse").outputs.collection.type).toEqual({
      id: "collection",
      args: [{ param: "T" }],
    })
  })

  test("loads into imp-registry without conflicts", () => {
    const registry = loadNodeLibrary(createRegistry(), pathingLibrary)
    expect(getNodeDefinition(registry, "traverse")?.outputs.collection?.type).toEqual({
      id: "collection",
      args: [{ param: "T" }],
    })
  })
})
