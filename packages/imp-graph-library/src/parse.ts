/** Graph library JSON parsing. Spec: imp-spec/docs/packages/imp-core-types/graph-libraries.md */

import type { Graph, GraphLibrary, NodeDefinition } from "imp-core-types"
import { isGraphBackedDefinition } from "imp-core-types"

export class GraphLibraryParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "GraphLibraryParseError"
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new GraphLibraryParseError(`${label} must be a non-empty string`)
  }
  return value
}

function validateGraph(graph: unknown, label: string): Graph {
  if (!isRecord(graph)) {
    throw new GraphLibraryParseError(`${label} must be an object`)
  }
  if (!isRecord(graph.nodes)) {
    throw new GraphLibraryParseError(`${label}.nodes must be an object`)
  }
  if (!isRecord(graph.edges)) {
    throw new GraphLibraryParseError(`${label}.edges must be an object`)
  }
  for (const [key, node] of Object.entries(graph.nodes)) {
    if (!isRecord(node)) {
      throw new GraphLibraryParseError(`${label}.nodes["${key}"] must be an object`)
    }
    if (node.id !== key) {
      throw new GraphLibraryParseError(`${label}.nodes["${key}"].id must equal key`)
    }
  }
  return graph as Graph
}

function validateDefinition(raw: unknown, index: number): NodeDefinition {
  if (!isRecord(raw)) {
    throw new GraphLibraryParseError(`definitions[${index}] must be an object`)
  }

  const id = requireString(raw.id, `definitions[${index}].id`)
  const definition = raw as NodeDefinition

  if (definition.implementation !== undefined) {
    throw new GraphLibraryParseError(
      `definitions[${index}] "${id}" must not declare implementation`,
    )
  }
  if (!definition.body) {
    throw new GraphLibraryParseError(`definitions[${index}] "${id}" must include body`)
  }
  if (!definition.bindings) {
    throw new GraphLibraryParseError(`definitions[${index}] "${id}" must include bindings`)
  }

  validateGraph(definition.body, `definitions[${index}] "${id}".body`)

  if (!isRecord(definition.inputs) || !isRecord(definition.outputs)) {
    throw new GraphLibraryParseError(`definitions[${index}] "${id}" must include inputs and outputs`)
  }

  for (const portId of Object.keys(definition.inputs)) {
    if (!(portId in definition.bindings.inputs)) {
      throw new GraphLibraryParseError(
        `definitions[${index}] "${id}" missing input binding for port "${portId}"`,
      )
    }
  }
  for (const portId of Object.keys(definition.outputs)) {
    if (!(portId in definition.bindings.outputs)) {
      throw new GraphLibraryParseError(
        `definitions[${index}] "${id}" missing output binding for port "${portId}"`,
      )
    }
  }

  for (const boundaryId of Object.values(definition.bindings.inputs)) {
    const node = definition.body.nodes[boundaryId]
    if (!node) {
      throw new GraphLibraryParseError(
        `definitions[${index}] "${id}" bound input node "${boundaryId}" not found in body`,
      )
    }
    if (node.type !== "input") {
      throw new GraphLibraryParseError(
        `definitions[${index}] "${id}" bound input node "${boundaryId}" must have type "input"`,
      )
    }
  }

  for (const boundaryId of Object.values(definition.bindings.outputs)) {
    const node = definition.body.nodes[boundaryId]
    if (!node) {
      throw new GraphLibraryParseError(
        `definitions[${index}] "${id}" bound output node "${boundaryId}" not found in body`,
      )
    }
    if (node.type !== "output") {
      throw new GraphLibraryParseError(
        `definitions[${index}] "${id}" bound output node "${boundaryId}" must have type "output"`,
      )
    }
  }

  if (!isGraphBackedDefinition(definition)) {
    throw new GraphLibraryParseError(`definitions[${index}] "${id}" is not graph-backed`)
  }

  return definition
}

export function parseGraphLibraryJson(text: string): GraphLibrary {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch (error) {
    throw new GraphLibraryParseError(
      `invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
    )
  }

  if (!isRecord(parsed)) {
    throw new GraphLibraryParseError("graph library must be a JSON object")
  }

  const id = requireString(parsed.id, "id")
  if (!Array.isArray(parsed.definitions)) {
    throw new GraphLibraryParseError("definitions must be an array")
  }

  const definitions = parsed.definitions.map(validateDefinition)
  const seen = new Set<string>()
  for (const definition of definitions) {
    if (seen.has(definition.id)) {
      throw new GraphLibraryParseError(`duplicate definition id "${definition.id}"`)
    }
    seen.add(definition.id)
  }

  return { id, definitions }
}

export function parseGraphLibrary(value: unknown): GraphLibrary {
  return parseGraphLibraryJson(JSON.stringify(value))
}
