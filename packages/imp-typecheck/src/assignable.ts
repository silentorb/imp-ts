/** Edge assignability (directional). Spec: imp-spec/docs/packages/imp-typecheck/type-system.md */

import type { Type } from "imp-core-types"
import { isConcreteType, isTypeVar, isUnionType } from "imp-core-types"
import {
  type Substitution,
  RIGID_TYPE_ID,
  applySubstitution,
  isAnyType,
  rigidParts,
  substitutionsEqual,
} from "./substitution"
import { isSubtypeId } from "./subtype"
import { formatType, unify, type UnifyResult } from "./unify"

export type AssignableResult = UnifyResult

function cannotAssign(source: Type, target: Type): AssignableResult {
  return { ok: false, message: `cannot assign ${formatType(source)} to ${formatType(target)}` }
}

/**
 * Succeeds when a value of `source` may flow into a port of type `target` (both normalized).
 *
 * Rule order (type-system.md, Assignability): `any`; union source (every member); rigid source
 * (via its bounds); variable source into a union (binds the whole union); union target (some
 * member, unambiguously); unify; declared subtypes with invariant arguments.
 */
export function assignable(
  source: Type,
  target: Type,
  subst: Substitution = new Map(),
): AssignableResult {
  const a = applySubstitution(source, subst)
  const b = applySubstitution(target, subst)

  if (isAnyType(a) || isAnyType(b)) return unify(a, b, subst)

  if (isUnionType(a)) {
    // A variable target takes the whole union rather than its first member.
    if (isTypeVar(b)) return unify(a, b, subst)
    let current = subst
    for (const member of a.union) {
      const result = assignable(member, b, current)
      if (!result.ok) return cannotAssign(a, b)
      current = result.subst
    }
    return { ok: true, subst: current }
  }

  const rigid = rigidParts(a)
  if (rigid) {
    if (isTypeVar(b) || (isConcreteType(b) && b.id === RIGID_TYPE_ID)) return unify(a, b, subst)
    for (const bound of rigid.bounds) {
      if (assignable(bound, b, subst).ok) return { ok: true, subst }
    }
    return cannotAssign(a, b)
  }

  if (isUnionType(b)) {
    if (isTypeVar(a)) return unify(a, b, subst)
    let accepted: Substitution | undefined
    for (const member of b.union) {
      const result = assignable(a, member, subst)
      if (!result.ok) continue
      if (accepted && !substitutionsEqual(accepted, result.subst)) {
        return {
          ok: false,
          message: `${formatType(a)} is ambiguous between members of ${formatType(b)}; state typeArgs explicitly`,
        }
      }
      accepted ??= result.subst
    }
    return accepted ? { ok: true, subst: accepted } : cannotAssign(a, b)
  }

  const unified = unify(a, b, subst)
  if (unified.ok) return unified

  if (!isConcreteType(a) || !isConcreteType(b)) {
    return unified
  }

  if (a.id === b.id || !isSubtypeId(a.id, b.id)) {
    return cannotAssign(a, b)
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
