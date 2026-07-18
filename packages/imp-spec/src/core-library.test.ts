import { describe, expect, test } from "bun:test"
import { createRegistry, getNodeType, loadLibrary } from "imp-registry"
import { coreNodeLibrary } from "./core-library.ts"

describe("coreNodeLibrary", () => {
  test("has expected boundary types and port templates", () => {
    expect(coreNodeLibrary.id).toBe("imp.core")
    expect(coreNodeLibrary.types.input).toEqual({
      id: "input",
      inputs: {},
      outputs: {
        value: { id: "value", type: { id: "any" } },
      },
    })
    expect(coreNodeLibrary.types.output).toEqual({
      id: "output",
      inputs: {
        value: { id: "value", type: { id: "any" } },
      },
      outputs: {},
    })
  })

  test("loads into imp-registry", () => {
    const registry = loadLibrary(createRegistry(), coreNodeLibrary)
    expect(getNodeType(registry, "input")?.outputs.value?.id).toBe("value")
    expect(getNodeType(registry, "output")?.inputs.value?.id).toBe("value")
  })
})
