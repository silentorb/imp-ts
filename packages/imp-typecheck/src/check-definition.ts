/** Graph-backed definition validation. Spec: imp-spec/docs/packages/imp-typecheck/type-system.md */

import type { Graph, NodeDefinition, PortId, SignalType } from "imp-core-types"
import { isGraphBackedDefinition } from "imp-core-types"
import type { Registry } from "imp-registry"
import { getNodeDefinition } from "imp-registry"
import { catalogPortType, resolvePortType } from "./graph-analysis"
import { type Substitution, type TypeCheckError, scopeSignalType } from "./substitution"
import { unify } from "./unify"
import { checkGraph } from "./check-graph"

function scopeDefinitionPort(type: SignalType, definitionId: string): SignalType {
  return scopeSignalType(type, `__def__${definitionId}`)
}

export function checkDefinition(
  definition: NodeDefinition,
  registry: Registry,
): TypeCheckError[] {
  const errors: TypeCheckError[] = []

  if (!isGraphBackedDefinition(definition)) {
    if (definition.bindings) {
      errors.push({
        definitionId: definition.id,
        message: "bindings are only valid on graph-backed definitions",
      })
    }
    return errors
  }

  if (definition.implementation) {
    errors.push({
      definitionId: definition.id,
      message: "graph-backed definitions must not declare implementation",
    })
  }

  const { body, bindings } = definition
  if (!body || !bindings) {
    errors.push({
      definitionId: definition.id,
      message: "graph-backed definitions require body and bindings",
    })
    return errors
  }

  for (const portId of Object.keys(definition.inputs) as PortId[]) {
    if (!(portId in bindings.inputs)) {
      errors.push({
        definitionId: definition.id,
        portId,
        message: `missing input binding for port "${portId}"`,
      })
    }
  }

  for (const portId of Object.keys(definition.outputs) as PortId[]) {
    if (!(portId in bindings.outputs)) {
      errors.push({
        definitionId: definition.id,
        portId,
        message: `missing output binding for port "${portId}"`,
      })
    }
  }

  const boundInputNodes = new Set(Object.values(bindings.inputs))
  const boundOutputNodes = new Set(Object.values(bindings.outputs))

  for (const node of Object.values(body.nodes)) {
    if (node.type === "input" && !boundInputNodes.has(node.id)) {
      errors.push({
        definitionId: definition.id,
        nodeId: node.id,
        message: `unbound boundary input node "${node.id}"`,
      })
    }
    if (node.type === "output" && !boundOutputNodes.has(node.id)) {
      errors.push({
        definitionId: definition.id,
        nodeId: node.id,
        message: `unbound boundary output node "${node.id}"`,
      })
    }
  }

  const subst: Substitution = new Map()

  for (const portId of Object.keys(definition.inputs) as PortId[]) {
    const boundaryId = bindings.inputs[portId]
    if (!boundaryId) continue
    const boundary = body.nodes[boundaryId]
    if (!boundary) {
      errors.push({
        definitionId: definition.id,
        portId,
        message: `bound input node "${boundaryId}" not found in body`,
      })
      continue
    }
    if (boundary.type !== "input") {
      errors.push({
        definitionId: definition.id,
        nodeId: boundaryId,
        message: `bound input node "${boundaryId}" must have type "input"`,
      })
      continue
    }
    const boundaryType = resolvePortType(body, boundaryId, "value", registry, subst)
    if (!boundaryType) continue
    const expected = scopeDefinitionPort(definition.inputs[portId]!.type, definition.id)
    const result = unify(boundaryType, expected, subst)
    if (!result.ok) {
      errors.push({
        definitionId: definition.id,
        nodeId: boundaryId,
        portId: "value",
        message: result.message,
      })
    }
  }

  for (const portId of Object.keys(definition.outputs) as PortId[]) {
    const boundaryId = bindings.outputs[portId]
    if (!boundaryId) continue
    const boundary = body.nodes[boundaryId]
    if (!boundary) {
      errors.push({
        definitionId: definition.id,
        portId,
        message: `bound output node "${boundaryId}" not found in body`,
      })
      continue
    }
    if (boundary.type !== "output") {
      errors.push({
        definitionId: definition.id,
        nodeId: boundaryId,
        message: `bound output node "${boundaryId}" must have type "output"`,
      })
      continue
    }
    const boundaryType = catalogPortType(boundary, registry, "value", "input")
    if (!boundaryType) continue
    const expected = scopeDefinitionPort(definition.outputs[portId]!.type, definition.id)
    const result = unify(boundaryType, expected, subst)
    if (!result.ok) {
      errors.push({
        definitionId: definition.id,
        nodeId: boundaryId,
        portId: "value",
        message: result.message,
      })
    }
  }

  errors.push(
    ...checkGraph(body, registry).map((error) => ({
      ...error,
      definitionId: definition.id,
    })),
  )

  return errors
}

function collectDefinitionRefs(body: Graph, registry: Registry): string[] {
  const refs: string[] = []
  for (const node of Object.values(body.nodes)) {
    const def = getNodeDefinition(registry, node.type)
    if (def && isGraphBackedDefinition(def)) {
      refs.push(node.type)
    }
  }
  return refs
}

function detectDefinitionCycle(
  startId: string,
  registry: Registry,
  visiting: Set<string>,
  visited: Set<string>,
): boolean {
  if (visiting.has(startId)) return true
  if (visited.has(startId)) return false

  visiting.add(startId)
  const def = getNodeDefinition(registry, startId)
  if (def?.body) {
    for (const ref of collectDefinitionRefs(def.body, registry)) {
      if (detectDefinitionCycle(ref, registry, visiting, visited)) {
        return true
      }
    }
  }
  visiting.delete(startId)
  visited.add(startId)
  return false
}

export function checkGraphDefinitions(registry: Registry): TypeCheckError[] {
  const errors: TypeCheckError[] = []

  for (const definition of Object.values(registry.definitions)) {
    if (!isGraphBackedDefinition(definition)) continue

    errors.push(...checkDefinition(definition, registry))

    const visiting = new Set<string>()
    const visited = new Set<string>()
    if (detectDefinitionCycle(definition.id, registry, visiting, visited)) {
      errors.push({
        definitionId: definition.id,
        message: `definition-reference cycle involving "${definition.id}"`,
      })
    }
  }

  return errors
}
