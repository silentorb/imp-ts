/** Edge assignability (directional). Spec: imp-spec/docs/packages/imp-typecheck/type-system.md */

import type { SignalType } from "imp-core-types"
import { isConcreteSignalType } from "imp-core-types"
import { type Substitution, applySubstitution } from "./substitution"
import { isSubtypeId } from "./subtype"
import { formatType, unify, type UnifyResult } from "./unify"

export type AssignableResult = UnifyResult

/**
 * Succeeds when a value of `source` may flow into a port of type `target`.
 * Tries unify first; on different concrete ids, allows declared subtypes with
 * invariant type-argument unification.
 */
export function assignable(
  source: SignalType,
  target: SignalType,
  subst: Substitution = new Map(),
): AssignableResult {
  const unified = unify(source, target, subst)
  if (unified.ok) return unified

  const a = applySubstitution(source, subst)
  const b = applySubstitution(target, subst)

  if (!isConcreteSignalType(a) || !isConcreteSignalType(b)) {
    return unified
  }

  if (a.id === b.id || !isSubtypeId(a.id, b.id)) {
    return {
      ok: false,
      message: `cannot assign ${formatType(a)} to ${formatType(b)}`,
    }
  }

  const aArgs = a.args ?? []
  const bArgs = b.args ?? []
  if (aArgs.length !== bArgs.length) {
    return {
      ok: false,
      message: `arity mismatch for ${a.id} <: ${b.id}: ${aArgs.length} vs ${bArgs.length}`,
    }
  }

  let current = subst
  for (let i = 0; i < aArgs.length; i++) {
    const result = unify(aArgs[i]!, bArgs[i]!, current)
    if (!result.ok) return result
    current = result.subst
  }

  return { ok: true, subst: current }
}
