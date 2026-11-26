/** Type substitution and type utilities. Spec: imp-spec/docs/packages/imp-typecheck/type-system.md */

import type { NodeId, TypeParamId } from "imp-core-types"
import {
  type ConcreteType,
  type Type,
  childTypes,
  isConcreteType,
  isTypeVar,
  isUnionType,
  mapChildTypes,
} from "imp-core-types"

export type Substitution = Map<TypeParamId, Type>

export interface TypeCheckError {
  nodeId?: string
  portId?: string
  definitionId?: string
  /** Set for type-definition errors. */
  typeId?: string
  message: string
}

export function scopedParam(nodeId: NodeId, param: TypeParamId): TypeParamId {
  return `${nodeId}::${param}`
}

export function scopeType(type: Type, nodeId: NodeId): Type {
  if (isTypeVar(type)) {
    return { param: scopedParam(nodeId, type.param) }
  }
  return mapChildTypes(type, (child) => scopeType(child, nodeId))
}

export function applySubstitution(
  type: Type,
  subst: Substitution,
): Type {
  if (isTypeVar(type)) {
    const resolved = subst.get(type.param)
    if (!resolved) return type
    return applySubstitution(resolved, subst)
  }
  if (isUnionType(type)) return canonicalUnion(type.union.map((member) => applySubstitution(member, subst)))
  return mapChildTypes(type, (child) => applySubstitution(child, subst))
}

export function isAnyType(type: Type): boolean {
  return isConcreteType(type) && type.id === "any" && !type.args?.length
}

export function containsTypeVar(type: Type): boolean {
  if (isTypeVar(type)) return true
  return childTypes(type).some(containsTypeVar)
}

export function assertConcreteArgs(args: Type[]): ConcreteType[] | string {
  for (const arg of args) {
    if (containsTypeVar(arg)) {
      return "typeArgs must be concrete types"
    }
  }
  return args as ConcreteType[]
}

/**
 * Canonical union of `members`: nested unions flatten, `any` absorbs, duplicates drop (first
 * occurrence wins), and a one-member union collapses to that member.
 */
export function canonicalUnion(members: readonly Type[]): Type {
  const flat: Type[] = []
  for (const member of members) {
    for (const part of isUnionType(member) ? member.union : [member]) {
      if (isAnyType(part)) return { id: "any" }
      if (!flat.some((existing) => typesEqual(existing, part))) flat.push(part)
    }
  }
  if (flat.length === 1) return flat[0]!
  return { union: flat }
}

/** Structural equality of two types (union member order matters; normalize first). */
export function typesEqual(a: Type, b: Type): boolean {
  if (isTypeVar(a) || isTypeVar(b)) {
    return isTypeVar(a) && isTypeVar(b) && a.param === b.param
  }
  if (isUnionType(a) || isUnionType(b)) {
    return (
      isUnionType(a) &&
      isUnionType(b) &&
      a.union.length === b.union.length &&
      a.union.every((member, i) => typesEqual(member, b.union[i]!))
    )
  }
  if (a.id !== b.id) return false
  const aArgs = a.args ?? []
  const bArgs = b.args ?? []
  return aArgs.length === bArgs.length && aArgs.every((arg, i) => typesEqual(arg, bArgs[i]!))
}

/** Whether two substitutions bind the same params to structurally equal types. */
export function substitutionsEqual(a: Substitution, b: Substitution): boolean {
  if (a === b) return true
  if (a.size !== b.size) return false
  for (const [key, value] of a) {
    const other = b.get(key)
    if (!other || !typesEqual(value, other)) return false
  }
  return true
}

/**
 * Reserved concrete id for a rigid type parameter while checking a generic graph-backed
 * definition's body. Never serialized; see type-system.md (Generic graph-backed definitions).
 */
export const RIGID_TYPE_ID = "$rigid"

/** A rigid stand-in for definition type parameter `param`, encoded as `$rigid<param, bound…>`. */
export function rigidType(param: string, bounds: readonly Type[] = []): ConcreteType {
  return { id: RIGID_TYPE_ID, args: [{ id: param }, ...bounds] }
}

/** The parameter id and bounds of a rigid type, or `undefined` for any other type. */
export function rigidParts(type: Type): { param: string; bounds: Type[] } | undefined {
  if (!isConcreteType(type) || type.id !== RIGID_TYPE_ID) return undefined
  const [param, ...bounds] = type.args ?? []
  if (!param || !isConcreteType(param)) return undefined
  return { param: param.id, bounds }
}

/** The declared parameter id of a scoped type variable (`node::A` → `A`). */
export function unscopedParam(param: string): string {
  const index = param.lastIndexOf("::")
  return index === -1 ? param : param.slice(index + 2)
}
