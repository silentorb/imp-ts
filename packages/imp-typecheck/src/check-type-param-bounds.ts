/** Type-parameter bound checking. Spec: imp-spec/docs/packages/imp-typecheck/type-system.md */

import type { GraphSource, SignalType, TypeConstraint } from "imp-core-types"
import { resolvedNodes } from "imp-core-types"
import { isConcreteSignalType } from "imp-core-types"
import type { Registry } from "imp-registry"
import { getTypeConstraint } from "imp-registry"
import type { SelectedDefinitions } from "./graph-analysis"
import { resolveSelections } from "./graph-analysis"
import { resolveTypeArgs } from "./resolve-type-args"
import { signalTypeMatches } from "./resolve-implementation"
import { isAnyType, rigidParts, type TypeCheckError } from "./substitution"
import { formatType } from "./unify"

function satisfiesConstraint(
  typeArg: SignalType,
  constraint: TypeConstraint,
): boolean {
  const rigid = rigidParts(typeArg)
  if (rigid) return rigid.bounds.includes(constraint.id)
  for (const member of constraint.members) {
    if (!isConcreteSignalType(member)) continue
    if (signalTypeMatches(member, typeArg)) return true
  }
  return false
}

export function checkTypeParamBounds(
  source: GraphSource,
  registry: Registry,
  selected?: SelectedDefinitions,
): TypeCheckError[] {
  const errors: TypeCheckError[] = []
  const selections = selected ?? resolveSelections(source, registry).selected

  for (const node of resolvedNodes(source)) {
    const definition = selections.get(node.id)
    if (!definition?.typeParams?.length) continue

    const typeArgs = resolveTypeArgs(source, node.id, registry, selections)
    if (!typeArgs) continue

    for (let index = 0; index < definition.typeParams.length; index++) {
      const param = definition.typeParams[index]!
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

        if (
          !satisfiesConstraint(typeArg, constraint) &&
          !rigidImplies(typeArg, constraint, registry)
        ) {
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

/** A rigid type also satisfies `constraint` when every member of one of its own bounds does. */
function rigidImplies(typeArg: SignalType, constraint: TypeConstraint, registry: Registry): boolean {
  const rigid = rigidParts(typeArg)
  if (!rigid) return false
  return rigid.bounds.some((bound) => {
    const own = getTypeConstraint(registry, bound)
    return (
      own !== undefined &&
      own.members.length > 0 &&
      own.members.every((member) => satisfiesConstraint(member, constraint))
    )
  })
}
