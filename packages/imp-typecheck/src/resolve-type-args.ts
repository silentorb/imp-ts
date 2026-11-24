/** Type-argument inference for implementation dispatch. */

import type { GraphSource, NodeId, SignalType } from "imp-core-types"
import { isTypeVar } from "imp-core-types"
import type { Registry } from "imp-registry"
import { getNodeDefinitions } from "imp-registry"
import type { SelectedDefinitions } from "./graph-analysis"
import { resolveSelections } from "./graph-analysis"
import { applySubstitution, scopedParam } from "./substitution"

export function resolveTypeArgs(
  source: GraphSource,
  nodeId: NodeId,
  registry: Registry,
  selected?: SelectedDefinitions,
): SignalType[] | undefined {
  const node = source.nodes.getNode(nodeId)
  if (!node) return undefined

  const selections = selected ?? resolveSelections(source, registry).selected
  const definition =
    selections.get(nodeId) ??
    (getNodeDefinitions(registry, node.type).length === 1
      ? getNodeDefinitions(registry, node.type)[0]
      : undefined)
  if (!definition) return undefined

  const params = definition.typeParams ?? []
  if (params.length === 0) return []

  if (node.typeArgs?.length) {
    return node.typeArgs
  }

  const { subst } = resolveSelections(source, registry)

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
