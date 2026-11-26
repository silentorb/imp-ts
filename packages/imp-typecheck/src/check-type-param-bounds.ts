/** Type-parameter bound checking. Spec: imp-spec/docs/packages/imp-typecheck/type-system.md */

import type { GraphSource } from "imp-core-types"
import { resolvedNodes } from "imp-core-types"
import type { Registry } from "imp-registry"
import { assignable } from "./assignable"
import type { SelectedDefinitions } from "./graph-analysis"
import { resolveSelections } from "./graph-analysis"
import { prepare } from "./normalize"
import { resolveTypeArgs } from "./resolve-type-args"
import type { TypeCheckError } from "./substitution"
import { formatType } from "./unify"

/**
 * Every resolved type argument must be assignable to each of its parameter's bounds (with an
 * empty substitution). `any` satisfies every bound; a rigid parameter satisfies a bound when one
 * of its own bounds is assignable to it.
 */
export function checkTypeParamBounds(
  source: GraphSource,
  registry: Registry,
  selected?: SelectedDefinitions,
): TypeCheckError[] {
  ({ source, registry } = prepare(source, registry))
  const errors: TypeCheckError[] = []
  const selections = selected ?? resolveSelections(source, registry).selected

  for (const node of resolvedNodes(source)) {
    const definition = selections.get(node.id)
    if (!definition?.typeParams?.length) continue

    const typeArgs = resolveTypeArgs(source, node.id, registry, selections)
    if (!typeArgs) continue

    for (let index = 0; index < definition.typeParams.length; index++) {
      const param = definition.typeParams[index]!
      const typeArg = typeArgs[index]
      if (!typeArg || !param.bounds?.length) continue

      for (const bound of param.bounds) {
        if (!assignable(typeArg, bound).ok) {
          errors.push({
            nodeId: node.id,
            message: `type argument ${formatType(typeArg)} does not satisfy bound ${formatType(bound)}`,
          })
        }
      }
    }
  }

  return errors
}
