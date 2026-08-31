import { describe, expect, test } from "bun:test"
import { loadNodeLibrary, createRegistry, getNodeDefinition } from "imp-registry"
import { coreNodeLibrary } from "./core-library"

describe("coreNodeLibrary", () => {
  test("has expected library id and boundary definitions", () => {
    expect(coreNodeLibrary.id).toBe("imp.core")
    expect(coreNodeLibrary.definitions).toHaveLength(3)
    const input = coreNodeLibrary.definitions.find((d) => d.id === "input")
    expect(input).toEqual({
      id: "input",
      typeParams: [{ id: "T" }],
      inputs: {},
      outputs: {
        value: { id: "value", type: { param: "T" } },
      },
    })
    const output = coreNodeLibrary.definitions.find((d) => d.id === "output")
    expect(output).toEqual({
      id: "output",
      typeParams: [{ id: "T" }],
      inputs: {
        value: { id: "value", type: { param: "T" } },
      },
      outputs: {},
    })
    const parameter = coreNodeLibrary.definitions.find((d) => d.id === "parameter")
    expect(parameter?.inputs.label).toEqual({
      id: "label",
      type: { id: "string" },
      defaultValue: "",
    })
  })

  test("loads into registry", () => {
    const registry = loadNodeLibrary(createRegistry(), coreNodeLibrary)
    expect(getNodeDefinition(registry, "input")?.id).toBe("input")
    expect(getNodeDefinition(registry, "output")?.id).toBe("output")
  })
})
