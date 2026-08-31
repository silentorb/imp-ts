/** Signal type helpers. Spec: imp-spec/docs/packages/imp-core-types/graph-model.md */

import type { SignalTypeId, TypeParamId } from "./graph"

/** Concrete signal type (e.g. boolean, collection<T>). */
export interface ConcreteSignalType {
  id: SignalTypeId
  args?: SignalType[]
}

/** Reference to a type parameter declared on a NodeType or GraphType. */
export interface TypeVarSignalType {
  param: TypeParamId
}

export type SignalType = ConcreteSignalType | TypeVarSignalType

export function isConcreteSignalType(type: SignalType): type is ConcreteSignalType {
  return "id" in type
}

export function isTypeVar(type: SignalType): type is TypeVarSignalType {
  return "param" in type
}

export function concreteType(id: SignalTypeId, ...args: SignalType[]): ConcreteSignalType {
  return args.length > 0 ? { id, args } : { id }
}

export function typeVar(param: TypeParamId): TypeVarSignalType {
  return { param }
}

export function collectionOf(element: SignalType): ConcreteSignalType {
  return concreteType("collection", element)
}
