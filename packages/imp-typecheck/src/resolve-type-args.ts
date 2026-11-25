/** Type-argument inference for implementation dispatch. */

import type { GraphSource, NodeId, Type } from "imp-core-types"
import type { Registry } from "imp-registry"
import { getNodeDefinitions } from "imp-registry"
import type { SelectedDefinitions } from "./graph-analysis"
import { resolveSelections } from "./graph-analysis"
import { applySubstitution, containsTypeVar, scopedParam } from "./substitution"

export function resolveTypeArgs(
  source: GraphSource,
  nodeId: NodeId,
  registry: Registry,
  selected?: SelectedDefinitions,
): Type[] | undefined {
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

  const resolved: Type[] = []

  for (const param of params) {
    const scoped = scopedParam(node.id, param.id)
    const bound = subst.get(scoped)
    if (!bound) return undefined
    // A parameter bound to another variable is resolved once that variable is.
    const type = applySubstitution(bound, subst)
    if (containsTypeVar(type)) return undefined
    resolved.push(type)
  }

  return resolved
}
