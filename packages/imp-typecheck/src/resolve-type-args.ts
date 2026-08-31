/** Type-argument inference for implementation dispatch. */

import type { Graph, Node, NodeId, SignalType } from "imp-core-types"
import { isConcreteSignalType, isTypeVar } from "imp-core-types"
import type { Registry } from "imp-registry"
import { getNodeType } from "imp-registry"
import { catalogPortType, collectGraphSubstitution } from "./graph-analysis"
import { applySubstitution, scopedParam } from "./substitution"

export function resolveTypeArgs(
  graph: Graph,
  nodeId: NodeId,
  registry: Registry,
): SignalType[] | undefined {
  const node = graph.nodes[nodeId]
  if (!node) return undefined

  const nodeType = getNodeType(registry, node.type)
  if (!nodeType) return undefined

  const params = nodeType.typeParams ?? []
  if (params.length === 0) return []

  if (node.typeArgs?.length) {
    return node.typeArgs
  }

  const subst = collectGraphSubstitution(graph, registry)
  const resolved: SignalType[] = []

  for (const param of params) {
    const scoped = scopedParam(node.id, param.id)
    const bound = subst.get(scoped)
    if (!bound || isTypeVar(bound)) {
      return undefined
    }
    resolved.push(applySubstitution(bound, subst))
  }

  return resolved
}
