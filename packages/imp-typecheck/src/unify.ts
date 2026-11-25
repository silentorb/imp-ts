/** Type unification. Spec: imp-spec/docs/packages/imp-typecheck/type-system.md */

import type { Type } from "imp-core-types"
import { concreteType, isConcreteType, isTypeVar } from "imp-core-types"
import {
  type Substitution,
  applySubstitution,
  containsTypeVar,
  isAnyType,
  rigidParts,
} from "./substitution"

export type UnifyResult =
  | { ok: true; subst: Substitution }
  | { ok: false; message: string }

export function unify(
  left: Type,
  right: Type,
  subst: Substitution = new Map(),
): UnifyResult {
  const a = applySubstitution(left, subst)
  const b = applySubstitution(right, subst)

  if (isAnyType(a)) {
    if (containsTypeVar(b)) {
      return { ok: true, subst: bindAllTypeVars(b, concreteType("any"), subst) }
    }
    return { ok: true, subst }
  }
  if (isAnyType(b)) {
    if (containsTypeVar(a)) {
      return { ok: true, subst: bindAllTypeVars(a, concreteType("any"), subst) }
    }
    return { ok: true, subst }
  }

  if (isTypeVar(a) && isTypeVar(b)) {
    if (a.param === b.param) return { ok: true, subst }
    const existingA = subst.get(a.param)
    if (existingA) return unify(existingA, b, subst)
    const existingB = subst.get(b.param)
    if (existingB) return unify(a, existingB, subst)
    const next = new Map(subst)
    next.set(b.param, a)
    return { ok: true, subst: next }
  }

  if (isTypeVar(a)) {
    return unifyVar(a.param, b, subst)
  }

  if (isTypeVar(b)) {
    return unifyVar(b.param, a, subst)
  }

  if (!isConcreteType(a) || !isConcreteType(b)) {
    return { ok: false, message: "invalid type shape" }
  }

  if (a.id !== b.id) {
    return { ok: false, message: `cannot unify ${formatType(a)} with ${formatType(b)}` }
  }

  const aArgs = a.args ?? []
  const bArgs = b.args ?? []
  if (aArgs.length !== bArgs.length) {
    return {
      ok: false,
      message: `arity mismatch for ${a.id}: ${aArgs.length} vs ${bArgs.length}`,
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

function unifyVar(
  param: string,
  other: Type,
  subst: Substitution,
): UnifyResult {
  const resolved = applySubstitution(other, subst)
  if (isTypeVar(resolved) && resolved.param === param) {
    return { ok: true, subst }
  }
  if (isTypeVar(resolved)) {
    return unify({ param }, resolved, subst)
  }

  const existing = subst.get(param)
  if (existing) {
    return unify(existing, resolved, subst)
  }

  const next = new Map(subst)
  next.set(param, resolved)
  return { ok: true, subst: next }
}

export function formatType(type: Type): string {
  const rigid = rigidParts(type)
  if (rigid) return rigid.param
  if (isTypeVar(type)) return type.param
  const args = type.args?.map(formatType).join(", ") ?? ""
  return args.length > 0 ? `${type.id}<${args}>` : type.id
}

function bindAllTypeVars(
  type: Type,
  binding: Type,
  subst: Substitution,
): Substitution {
  if (isTypeVar(type)) {
    const existing = subst.get(type.param)
    if (existing) return subst
    const next = new Map(subst)
    next.set(type.param, binding)
    return next
  }
  if (isConcreteType(type) && type.args?.length) {
    let current = subst
    for (const arg of type.args) {
      current = bindAllTypeVars(arg, binding, current)
    }
    return current
  }
  return subst
}
