/** Type substitution and signal-type utilities. Spec: imp-spec/docs/packages/imp-typecheck/type-system.md */

import type { NodeId, TypeParamId } from "imp-core-types"
import {
  type ConcreteSignalType,
  type SignalType,
  isConcreteSignalType,
  isTypeVar,
} from "imp-core-types"

export type Substitution = Map<TypeParamId, SignalType>

export interface TypeCheckError {
  nodeId?: string
  portId?: string
  definitionId?: string
  message: string
}

export function scopedParam(nodeId: NodeId, param: TypeParamId): TypeParamId {
  return `${nodeId}::${param}`
}

export function scopeSignalType(type: SignalType, nodeId: NodeId): SignalType {
  if (isTypeVar(type)) {
    return { param: scopedParam(nodeId, type.param) }
  }
  if (isConcreteSignalType(type) && type.args?.length) {
    return {
      id: type.id,
      args: type.args.map((arg) => scopeSignalType(arg, nodeId)),
    }
  }
  return type
}

export function applySubstitution(
  type: SignalType,
  subst: Substitution,
): SignalType {
  if (isTypeVar(type)) {
    const resolved = subst.get(type.param)
    if (!resolved) return type
    return applySubstitution(resolved, subst)
  }
  if (isConcreteSignalType(type) && type.args?.length) {
    return {
      id: type.id,
      args: type.args.map((arg) => applySubstitution(arg, subst)),
    }
  }
  return type
}

export function isAnyType(type: SignalType): boolean {
  return isConcreteSignalType(type) && type.id === "any" && !type.args?.length
}

export function containsTypeVar(type: SignalType): boolean {
  if (isTypeVar(type)) return true
  if (isConcreteSignalType(type) && type.args?.length) {
    return type.args.some(containsTypeVar)
  }
  return false
}

export function assertConcreteArgs(args: SignalType[]): ConcreteSignalType[] | string {
  for (const arg of args) {
    if (isTypeVar(arg)) {
      return "typeArgs must be concrete signal types"
    }
    if (isConcreteSignalType(arg) && arg.args?.some(containsTypeVar)) {
      return "typeArgs must be concrete signal types"
    }
  }
  return args as ConcreteSignalType[]
}

/**
 * Reserved concrete id for a rigid type parameter while checking a generic graph-backed
 * definition's body. Never serialized; see type-system.md (Generic graph-backed definitions).
 */
export const RIGID_TYPE_ID = "$rigid"

/** A rigid stand-in for definition type parameter `param`, encoded as `$rigid<param, bound…>`. */
export function rigidType(param: string, bounds: readonly string[] = []): ConcreteSignalType {
  return { id: RIGID_TYPE_ID, args: [{ id: param }, ...bounds.map((bound) => ({ id: bound }))] }
}

/** The parameter id and bounds of a rigid type, or `undefined` for any other type. */
export function rigidParts(type: SignalType): { param: string; bounds: string[] } | undefined {
  if (!isConcreteSignalType(type) || type.id !== RIGID_TYPE_ID) return undefined
  const ids = (type.args ?? []).flatMap((arg) => (isConcreteSignalType(arg) ? [arg.id] : []))
  const [param, ...bounds] = ids
  return param === undefined ? undefined : { param, bounds }
}

/** The declared parameter id of a scoped type variable (`node::A` → `A`). */
export function unscopedParam(param: string): string {
  const index = param.lastIndexOf("::")
  return index === -1 ? param : param.slice(index + 2)
}
