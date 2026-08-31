/** Type-parameter bound checking. Spec: imp-spec/docs/packages/imp-typecheck/type-system.md */

import type { Graph, SignalType, TypeConstraint } from "imp-core-types"
import { isConcreteSignalType } from "imp-core-types"
import type { Registry } from "imp-registry"
import { getNodeType, getTypeConstraint } from "imp-registry"
import { effectiveNodeType } from "./graph-analysis"
import { resolveTypeArgs } from "./resolve-type-args"
import { signalTypeMatches } from "./resolve-implementation"
import { isAnyType, type TypeCheckError } from "./substitution"
import { formatType } from "./unify"

function satisfiesConstraint(
  typeArg: SignalType,
  constraint: TypeConstraint,
): boolean {
  for (const member of constraint.members) {
    if (!isConcreteSignalType(member)) continue
    if (signalTypeMatches(member, typeArg)) return true
  }
  return false
}

export function checkTypeParamBounds(
  graph: Graph,
  registry: Registry,
): TypeCheckError[] {
  const errors: TypeCheckError[] = []

  for (const node of Object.values(graph.nodes)) {
    const nodeType = getNodeType(registry, node.type)
    if (!nodeType?.typeParams?.length) continue

    const typeArgs = resolveTypeArgs(graph, node.id, registry)
    if (!typeArgs) continue

    for (let index = 0; index < nodeType.typeParams.length; index++) {
      const param = nodeType.typeParams[index]!
      if (!param.bounds?.length) continue

      const typeArg = typeArgs[index]
      if (!typeArg || !isConcreteSignalType(typeArg)) continue

      if (isAnyType(typeArg)) continue

      for (const boundId of param.bounds) {
        const constraint = getTypeConstraint(registry, boundId)
        if (!constraint) {
          errors.push({
            nodeId: node.id,
            message: `unknown type constraint "${boundId}"`,
          })
          continue
        }

        if (!satisfiesConstraint(typeArg, constraint)) {
          errors.push({
            nodeId: node.id,
            message: `type argument ${formatType(typeArg)} does not satisfy bound "${boundId}"`,
          })
        }
      }
    }
  }

  return errors
}
