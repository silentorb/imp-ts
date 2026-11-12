/** Shared graph analysis helpers for type checking and implementation dispatch. */

import type { Graph, Node, NodeDefinition, NodeId, PortId, SignalType } from "imp-core-types"
import type { Registry } from "imp-registry"
import { getNodeDefinitions } from "imp-registry"
import { instantiateNodeDefinition } from "./instantiate"
import { type Substitution, applySubstitution, scopeSignalType } from "./substitution"
import { assignable } from "./assignable"

export type SelectedDefinitions = ReadonlyMap<NodeId, NodeDefinition>

export function effectiveDefinition(
  node: Node,
  definition: NodeDefinition,
): NodeDefinition {
  if (!node.typeArgs?.length) return definition
  return instantiateNodeDefinition(definition, node.typeArgs)
}

/** @deprecated Prefer selected overload + effectiveDefinition */
export function effectiveNodeDefinition(node: Node, registry: Registry) {
  const overloads = getNodeDefinitions(registry, node.type)
  if (overloads.length !== 1) return undefined
  return effectiveDefinition(node, overloads[0]!)
}

/** @deprecated Use effectiveNodeDefinition */
export const effectiveNodeType = effectiveNodeDefinition

export function catalogPortTypeFromDefinition(
  node: Node,
  definition: NodeDefinition,
  portId: PortId,
  direction: "input" | "output",
): SignalType | undefined {
  const effective = effectiveDefinition(node, definition)
  const ports = direction === "input" ? effective.inputs : effective.outputs
  const port = ports[portId]
  if (!port) return undefined
  return scopeSignalType(port.type, node.id)
}

export function catalogPortType(
  node: Node,
  registry: Registry,
  portId: PortId,
  direction: "input" | "output",
  selected?: SelectedDefinitions,
): SignalType | undefined {
  const definition = selected?.get(node.id) ?? effectiveNodeDefinition(node, registry)
  if (!definition) return undefined
  return catalogPortTypeFromDefinition(node, definition, portId, direction)
}

/**
 * Try whether `candidate` is consistent with all edges touching `nodeId` whose
 * other endpoint already has a selected definition (or a sole overload).
 */
export function candidateSurvives(
  graph: Graph,
  nodeId: NodeId,
  candidate: NodeDefinition,
  registry: Registry,
  selected: SelectedDefinitions,
  subst: Substitution,
): { ok: true; subst: Substitution } | { ok: false } {
  const node = graph.nodes[nodeId]
  if (!node) return { ok: false }

  let trial = new Map(subst)

  for (const edge of Object.values(graph.edges)) {
    if (edge.to.node === nodeId) {
      const fromNode = graph.nodes[edge.from.node]
      if (!fromNode) return { ok: false }
      const fromDef = selected.get(fromNode.id)
      if (!fromDef) continue
      const outputType = catalogPortTypeFromDefinition(
        fromNode,
        fromDef,
        edge.from.port,
        "output",
      )
      const inputType = catalogPortTypeFromDefinition(node, candidate, edge.to.port, "input")
      if (!outputType || !inputType) return { ok: false }
      const result = assignable(outputType, inputType, trial)
      if (!result.ok) return { ok: false }
      trial = result.subst
    }

    if (edge.from.node === nodeId) {
      const toNode = graph.nodes[edge.to.node]
      if (!toNode) return { ok: false }
      const toDef = selected.get(toNode.id)
      if (!toDef) continue
      const outputType = catalogPortTypeFromDefinition(
        node,
        candidate,
        edge.from.port,
        "output",
      )
      const inputType = catalogPortTypeFromDefinition(toNode, toDef, edge.to.port, "input")
      if (!outputType || !inputType) return { ok: false }
      const result = assignable(outputType, inputType, trial)
      if (!result.ok) return { ok: false }
      trial = result.subst
    }
  }

  return { ok: true, subst: trial }
}

/**
 * Fixed-point overload selection + substitution accumulation.
 * Returns selected definitions for every node that has a non-empty overload set,
 * plus the accumulated substitution — or partial results with errors deferred to checkGraph.
 */
export function resolveSelections(
  graph: Graph,
  registry: Registry,
): {
  selected: Map<NodeId, NodeDefinition>
  subst: Substitution
  unknownTypes: NodeId[]
} {
  const selected = new Map<NodeId, NodeDefinition>()
  const unknownTypes: NodeId[] = []
  let subst: Substitution = new Map()

  for (const node of Object.values(graph.nodes)) {
    const overloads = getNodeDefinitions(registry, node.type)
    if (overloads.length === 0) {
      unknownTypes.push(node.id)
      continue
    }
    if (overloads.length === 1) {
      selected.set(node.id, overloads[0]!)
    }
  }

  let changed = true
  while (changed) {
    changed = false

    for (const node of Object.values(graph.nodes)) {
      if (selected.has(node.id)) continue
      const overloads = getNodeDefinitions(registry, node.type)
      if (overloads.length <= 1) continue

      const survivors: { definition: NodeDefinition; subst: Substitution }[] = []
      for (const candidate of overloads) {
        const result = candidateSurvives(
          graph,
          node.id,
          candidate,
          registry,
          selected,
          subst,
        )
        if (result.ok) {
          survivors.push({ definition: candidate, subst: result.subst })
        }
      }

      if (survivors.length === 1) {
        selected.set(node.id, survivors[0]!.definition)
        subst = survivors[0]!.subst
        changed = true
      }
    }

    for (const edge of Object.values(graph.edges)) {
      const fromNode = graph.nodes[edge.from.node]
      const toNode = graph.nodes[edge.to.node]
      if (!fromNode || !toNode) continue
      const fromDef = selected.get(fromNode.id)
      const toDef = selected.get(toNode.id)
      if (!fromDef || !toDef) continue

      const outputType = catalogPortTypeFromDefinition(
        fromNode,
        fromDef,
        edge.from.port,
        "output",
      )
      const inputType = catalogPortTypeFromDefinition(toNode, toDef, edge.to.port, "input")
      if (!outputType || !inputType) continue

      const result = assignable(outputType, inputType, subst)
      if (result.ok && result.subst !== subst && result.subst.size !== subst.size) {
        subst = result.subst
        changed = true
      } else if (result.ok) {
        // Also detect deeper binding changes by comparing entries
        let differs = result.subst.size !== subst.size
        if (!differs) {
          for (const [k, v] of result.subst) {
            if (subst.get(k) !== v) {
              differs = true
              break
            }
          }
        }
        if (differs) {
          subst = result.subst
          changed = true
        }
      }
    }
  }

  return { selected, subst, unknownTypes }
}

export function collectGraphSubstitution(graph: Graph, registry: Registry): Substitution {
  return resolveSelections(graph, registry).subst
}

export function resolvePortType(
  graph: Graph,
  nodeId: NodeId,
  portId: PortId,
  registry: Registry,
  subst: Substitution = new Map(),
  selected?: SelectedDefinitions,
): SignalType | undefined {
  const node = graph.nodes[nodeId]
  if (!node) return undefined

  const definition =
    selected?.get(nodeId) ??
    (getNodeDefinitions(registry, node.type).length === 1
      ? getNodeDefinitions(registry, node.type)[0]
      : undefined)
  if (!definition) return undefined

  const outputType = catalogPortTypeFromDefinition(node, definition, portId, "output")
  if (outputType) {
    return applySubstitution(outputType, subst)
  }

  const inputTemplate = effectiveDefinition(node, definition).inputs[portId]
  if (!inputTemplate) return undefined

  let inputType = scopeSignalType(inputTemplate.type, node.id)
  let localSubst = subst

  for (const edge of Object.values(graph.edges)) {
    if (edge.to.node === nodeId && edge.to.port === portId) {
      const sourceNode = graph.nodes[edge.from.node]
      if (!sourceNode) continue
      const sourceType = catalogPortType(
        sourceNode,
        registry,
        edge.from.port,
        "output",
        selected,
      )
      if (sourceType) {
        const result = assignable(sourceType, inputType, localSubst)
        if (result.ok) {
          localSubst = result.subst
          inputType = applySubstitution(inputType, localSubst)
        }
      }
    }
  }

  return applySubstitution(inputType, localSubst)
}
