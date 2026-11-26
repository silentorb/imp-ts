/** Imp file JSON parsing and structural validation. Spec: imp-spec/docs/packages/imp-file/imp-files.md */

import type {
  Graph,
  ImpFile,
  ImpFileEdge,
  Node,
  NodeDefinition,
  TypeDefinition,
} from "imp-core-types"

export class ImpFileParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ImpFileParseError"
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new ImpFileParseError(`${label} must be a non-empty string`)
  }
  return value
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new ImpFileParseError(`${label} must be an object`)
  }
  return value
}

function requirePortReference(value: unknown, label: string): void {
  const reference = requireRecord(value, label)
  requireString(reference.node, `${label}.node`)
  requireString(reference.port, `${label}.port`)
}

function validateGraph(value: unknown, label: string): Graph {
  const graph = requireRecord(value, label)
  const nodes = requireRecord(graph.nodes, `${label}.nodes`)
  const edges = requireRecord(graph.edges, `${label}.edges`)
  for (const [key, node] of Object.entries(nodes)) {
    const record = requireRecord(node, `${label}.nodes["${key}"]`)
    if (record.id !== key) {
      throw new ImpFileParseError(`${label}.nodes["${key}"].id must equal key`)
    }
  }
  for (const [key, edge] of Object.entries(edges)) {
    const record = requireRecord(edge, `${label}.edges["${key}"]`)
    requirePortReference(record.from, `${label}.edges["${key}"].from`)
    requirePortReference(record.to, `${label}.edges["${key}"].to`)
  }
  return graph as unknown as Graph
}

function validateGraphBacked(definition: NodeDefinition, label: string): void {
  const { bindings, body } = definition
  if (definition.implementation !== undefined) {
    throw new ImpFileParseError(`${label} is graph-backed and must not declare implementation`)
  }
  if (!bindings) {
    throw new ImpFileParseError(`${label} has a body and must include bindings`)
  }
  validateGraph(body, `${label}.body`)
  requireRecord(bindings.inputs, `${label}.bindings.inputs`)
  requireRecord(bindings.outputs, `${label}.bindings.outputs`)

  for (const [direction, ports, bound] of [
    ["input", definition.inputs, bindings.inputs],
    ["output", definition.outputs, bindings.outputs],
  ] as const) {
    for (const portId of Object.keys(ports)) {
      if (!(portId in bound)) {
        throw new ImpFileParseError(`${label} missing ${direction} binding for port "${portId}"`)
      }
    }
    for (const portId of Object.keys(bound)) {
      if (!(portId in ports)) {
        throw new ImpFileParseError(`${label} binds undeclared ${direction} port "${portId}"`)
      }
    }
    for (const boundaryId of Object.values(bound)) {
      const node = body!.nodes[boundaryId]
      if (!node) {
        throw new ImpFileParseError(`${label} bound ${direction} node "${boundaryId}" not found in body`)
      }
      if (node.type !== direction) {
        throw new ImpFileParseError(
          `${label} bound ${direction} node "${boundaryId}" must have type "${direction}"`,
        )
      }
    }
  }
}

function validateDefinition(raw: unknown, label: string): NodeDefinition {
  const record = requireRecord(raw, label)
  requireString(record.id, `${label}.id`)
  requireRecord(record.inputs, `${label}.inputs`)
  requireRecord(record.outputs, `${label}.outputs`)
  const definition = record as unknown as NodeDefinition
  if (definition.body !== undefined) {
    validateGraphBacked(definition, label)
  } else if (definition.bindings !== undefined) {
    throw new ImpFileParseError(`${label} declares bindings without a body`)
  }
  return definition
}

function validateType(raw: unknown, label: string): TypeDefinition {
  const record = requireRecord(raw, label)
  requireString(record.id, `${label}.id`)
  requireRecord(record.type, `${label}.type`)
  if (record.params !== undefined && !Array.isArray(record.params)) {
    throw new ImpFileParseError(`${label}.params must be an array`)
  }
  return record as unknown as TypeDefinition
}

function validateNode(raw: unknown, label: string): Node {
  const record = requireRecord(raw, label)
  requireString(record.id, `${label}.id`)
  requireString(record.type, `${label}.type`)
  requireRecord(record.inputs, `${label}.inputs`)
  return record as unknown as Node
}

function validateEdge(raw: unknown, label: string): ImpFileEdge {
  const record = requireRecord(raw, label)
  requireString(record.id, `${label}.id`)
  requirePortReference(record.from, `${label}.from`)
  requirePortReference(record.to, `${label}.to`)
  return record as unknown as ImpFileEdge
}

function section<T extends { id: string }>(
  value: unknown,
  name: string,
  validate: (raw: unknown, label: string) => T,
): T[] | undefined {
  if (value === undefined) return undefined
  if (!Array.isArray(value)) {
    throw new ImpFileParseError(`${name} must be an array`)
  }
  const elements = value.map((raw, index) => validate(raw, `${name}[${index}]`))
  const seen = new Set<string>()
  for (const element of elements) {
    if (seen.has(element.id)) {
      throw new ImpFileParseError(`duplicate ${name} id "${element.id}"`)
    }
    seen.add(element.id)
  }
  return elements
}

/** Validates an already-parsed JSON value as an Imp file. */
export function parseImpFile(value: unknown): ImpFile {
  const record = requireRecord(value, "Imp file")
  if (record.format !== undefined && record.format !== "imp") {
    throw new ImpFileParseError(`format must be "imp" when present`)
  }
  const file: ImpFile = {}
  if (record.format !== undefined) file.format = "imp"
  if (record.id !== undefined) file.id = requireString(record.id, "id")
  const types = section(record.types, "types", validateType)
  const definitions = section(record.definitions, "definitions", validateDefinition)
  const nodes = section(record.nodes, "nodes", validateNode)
  const edges = section(record.edges, "edges", validateEdge)
  if (types) file.types = types
  if (definitions) file.definitions = definitions
  if (nodes) file.nodes = nodes
  if (edges) file.edges = edges
  return file
}

/** Parses UTF-8 JSON text and validates it as an Imp file. */
export function parseImpFileJson(text: string): ImpFile {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch (error) {
    throw new ImpFileParseError(
      `invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
  return parseImpFile(parsed)
}
