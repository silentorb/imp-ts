/** Shared graph analysis helpers for type checking and implementation dispatch. */

import type { GraphSource, Node, NodeDefinition, NodeId, PortId, Type } from "imp-core-types"
import { resolvedNodes } from "imp-core-types"
import type { Registry } from "imp-registry"
import { getNodeDefinitions } from "imp-registry"
import { instantiateNodeDefinition } from "./instantiate"
import { isUnionType } from "imp-core-types"
import { type Substitution, applySubstitution, isAnyType, scopeType } from "./substitution"
import { assignable } from "./assignable"
import { normalizeNode, normalizedRegistry, prepare } from "./normalize"

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
  const normalized = normalizedRegistry(registry)
  const overloads = getNodeDefinitions(normalized, node.type)
  if (overloads.length !== 1) return undefined
  return effectiveDefinition(normalizeNode(node, normalized), overloads[0]!)
}

/** @deprecated Use effectiveNodeDefinition */
export const effectiveNodeType = effectiveNodeDefinition

export function catalogPortTypeFromDefinition(
  node: Node,
  definition: NodeDefinition,
  portId: PortId,
  direction: "input" | "output",
): Type | undefined {
  const effective = effectiveDefinition(node, definition)
  const ports = direction === "input" ? effective.inputs : effective.outputs
  const port = ports[portId]
  if (!port) return undefined
  return scopeType(port.type, node.id)
}

export function catalogPortType(
  node: Node,
  registry: Registry,
  portId: PortId,
  direction: "input" | "output",
  selected?: SelectedDefinitions,
): Type | undefined {
  // The raw (sole) definition: catalogPortTypeFromDefinition applies Node.typeArgs itself.
  const normalized = normalizedRegistry(registry)
  const overloads = getNodeDefinitions(normalized, node.type)
  const definition = selected?.get(node.id) ?? (overloads.length === 1 ? overloads[0] : undefined)
  if (!definition) return undefined
  return catalogPortTypeFromDefinition(normalizeNode(node, normalized), definition, portId, direction)
}

/**
 * Try whether `candidate` is consistent with all edges touching `nodeId` whose
 * other endpoint already has a selected definition (or a sole overload).
 */
export function candidateSurvives(
  source: GraphSource,
  nodeId: NodeId,
  candidate: NodeDefinition,
  registry: Registry,
  selected: SelectedDefinitions,
  subst: Substitution,
): { ok: true; subst: Substitution } | { ok: false } {
  const node = source.nodes.getNode(nodeId)
  if (!node) return { ok: false }

  let trial = new Map(subst)

  for (const [, edge] of source.edges.edgeEntries()) {
    if (edge.to.node === nodeId) {
      const fromNode = source.nodes.getNode(edge.from.node)
      if (!fromNode) continue // unresolved endpoints are reported by checkGraph
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
      const outcome = tryEdge(outputType, inputType, trial)
      if (!outcome) return { ok: false }
      trial = outcome
    }

    if (edge.from.node === nodeId) {
      const toNode = source.nodes.getNode(edge.to.node)
      if (!toNode) continue
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
      const outcome = tryEdge(outputType, inputType, trial)
      if (!outcome) return { ok: false }
      trial = outcome
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
  source: GraphSource,
  registry: Registry,
): {
  selected: Map<NodeId, NodeDefinition>
  subst: Substitution
  unknownTypes: NodeId[]
} {
  ({ source, registry } = prepare(source, registry))
  const selected = new Map<NodeId, NodeDefinition>()
  const unknownTypes: NodeId[] = []
  let subst: Substitution = new Map()

  for (const node of resolvedNodes(source)) {
    const overloads = getNodeDefinitions(registry, node.type)
    if (overloads.length === 0) {
      unknownTypes.push(node.id)
      continue
    }
    if (overloads.length === 1) {
      selected.set(node.id, overloads[0]!)
    }
  }

  // Edges into `any` or union ports are the weakest constraint: settle everything else first,
  // then apply them (binding still-free variables to `any` or the whole union) and settle again.
  for (const includeWeakTargets of [false, true]) {
    let changed = true
    while (changed) {
      changed = false

      for (const node of resolvedNodes(source)) {
        if (selected.has(node.id)) continue
        const overloads = getNodeDefinitions(registry, node.type)
        if (overloads.length <= 1) continue

        const survivors: { definition: NodeDefinition; subst: Substitution }[] = []
        for (const candidate of overloads) {
          const result = candidateSurvives(
            source,
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

      for (const [, edge] of source.edges.edgeEntries()) {
        const fromNode = source.nodes.getNode(edge.from.node)
        const toNode = source.nodes.getNode(edge.to.node)
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

        if (!includeWeakTargets && targetsWeak(inputType, subst)) continue
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
  }

  return { selected, subst, unknownTypes }
}

export function collectGraphSubstitution(source: GraphSource, registry: Registry): Substitution {
  ({ source, registry } = prepare(source, registry))
  return resolveSelections(source, registry).subst
}

export function resolvePortType(
  source: GraphSource,
  nodeId: NodeId,
  portId: PortId,
  registry: Registry,
  subst: Substitution = new Map(),
  selected?: SelectedDefinitions,
): Type | undefined {
  ({ source, registry } = prepare(source, registry))
  const node = source.nodes.getNode(nodeId)
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

  let inputType = scopeType(inputTemplate.type, node.id)
  let localSubst = subst

  for (const [, edge] of source.edges.edgeEntries()) {
    if (edge.to.node === nodeId && edge.to.port === portId) {
      const sourceNode = source.nodes.getNode(edge.from.node)
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

/** True when an edge's target port type is `any` or a union under `subst` (the weakest inference constraints). */
function targetsWeak(inputType: Type, subst: Substitution): boolean {
  const resolved = applySubstitution(inputType, subst)
  return isAnyType(resolved) || isUnionType(resolved)
}

/**
 * One edge of an overload trial. `any` targets are skipped; union targets must accept the source
 * but do not bind anything (they are weak: see resolveSelections). Returns the next trial
 * substitution, or `undefined` when the edge rules the candidate out.
 */
function tryEdge(outputType: Type, inputType: Type, trial: Substitution): Substitution | undefined {
  const resolved = applySubstitution(inputType, trial)
  if (isAnyType(resolved)) return trial
  const result = assignable(outputType, inputType, trial)
  if (!result.ok) return undefined
  return isUnionType(resolved) ? trial : result.subst
}
