import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { parseGraphLibraryJson, GraphLibraryParseError } from "./parse"

const fixtureDir = join(import.meta.dir, "..", "tests", "fixtures")

describe("parseGraphLibraryJson", () => {
  test("parses valid library fixture", () => {
    const text = readFileSync(join(fixtureDir, "passthrough.json"), "utf8")
    const library = parseGraphLibraryJson(text)
    expect(library.id).toBe("example.query-patterns")
    expect(library.definitions).toHaveLength(1)
    expect(library.definitions[0]?.id).toBe("passthrough")
    expect(library.definitions[0]?.name).toBe("Passthrough rows")
  })

  test("accepts empty definitions array", () => {
    const library = parseGraphLibraryJson(JSON.stringify({ id: "empty.lib", definitions: [] }))
    expect(library.definitions).toEqual([])
  })

  test("rejects duplicate definition ids", () => {
    expect(() =>
      parseGraphLibraryJson(
        JSON.stringify({
          id: "dup.lib",
          definitions: [
            {
              id: "same",
              inputs: {},
              outputs: {},
              bindings: { inputs: {}, outputs: {} },
              body: { nodes: {}, edges: {} },
            },
            {
              id: "same",
              inputs: {},
              outputs: {},
              bindings: { inputs: {}, outputs: {} },
              body: { nodes: {}, edges: {} },
            },
          ],
        }),
      ),
    ).toThrow(GraphLibraryParseError)
  })

  test("rejects primitive definition with implementation", () => {
    expect(() =>
      parseGraphLibraryJson(
        JSON.stringify({
          id: "bad.lib",
          definitions: [
            {
              id: "filter",
              implementation: { kind: "universal", id: "filter" },
              inputs: {},
              outputs: {},
              bindings: { inputs: {}, outputs: {} },
              body: { nodes: {}, edges: {} },
            },
          ],
        }),
      ),
    ).toThrow(/must not declare implementation/)
  })
})
