/** Shared graph analysis helpers for type checking and implementation dispatch. */

import type { Graph, Node, NodeId, PortId, SignalType } from "imp-core-types"
import type { Registry } from "imp-registry"
import { getNodeDefinition } from "imp-registry"
import { instantiateNodeDefinition } from "./instantiate"
import { type Substitution, applySubstitution, scopeSignalType } from "./substitution"
import { unify } from "./unify"

export function effectiveNodeDefinition(node: Node, registry: Registry) {
  const catalog = getNodeDefinition(registry, node.type)
  if (!catalog) return undefined
  if (!node.typeArgs?.length) return catalog
  return instantiateNodeDefinition(catalog, node.typeArgs)
}

/** @deprecated Use effectiveNodeDefinition */
export const effectiveNodeType = effectiveNodeDefinition

export function catalogPortType(
  node: Node,
  registry: Registry,
  portId: PortId,
  direction: "input" | "output",
): SignalType | undefined {
  const definition = effectiveNodeDefinition(node, registry)
  if (!definition) return undefined
  const ports = direction === "input" ? definition.inputs : definition.outputs
  const port = ports[portId]
  if (!port) return undefined
  return scopeSignalType(port.type, node.id)
}

export function collectGraphSubstitution(graph: Graph, registry: Registry): Substitution {
  let subst: Substitution = new Map()

  for (const edge of Object.values(graph.edges)) {
    const fromNode = graph.nodes[edge.from.node]
    const toNode = graph.nodes[edge.to.node]
    if (!fromNode || !toNode) continue

    const outputType = catalogPortType(fromNode, registry, edge.from.port, "output")
    const inputType = catalogPortType(toNode, registry, edge.to.port, "input")
    if (!outputType || !inputType) continue

    const result = unify(outputType, inputType, subst)
    if (result.ok) {
      subst = result.subst
    }
  }

  return subst
}

export function resolvePortType(
  graph: Graph,
  nodeId: NodeId,
  portId: PortId,
  registry: Registry,
  subst: Substitution = new Map(),
): SignalType | undefined {
  const node = graph.nodes[nodeId]
  if (!node) return undefined

  const definition = effectiveNodeDefinition(node, registry)
  if (!definition) return undefined

  const outputType = catalogPortType(node, registry, portId, "output")
  if (outputType) {
    return applySubstitution(outputType, subst)
  }

  const inputTemplate = definition.inputs[portId]
  if (!inputTemplate) return undefined

  let inputType = scopeSignalType(inputTemplate.type, node.id)
  let localSubst = subst

  for (const edge of Object.values(graph.edges)) {
    if (edge.to.node === nodeId && edge.to.port === portId) {
      const sourceType = catalogPortType(
        graph.nodes[edge.from.node]!,
        registry,
        edge.from.port,
        "output",
      )
      if (sourceType) {
        const result = unify(sourceType, inputType, localSubst)
        if (result.ok) {
          localSubst = result.subst
          inputType = applySubstitution(inputType, localSubst)
        }
      }
    }
  }

  return applySubstitution(inputType, localSubst)
}
