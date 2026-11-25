/** Type helpers. Spec: imp-spec/docs/packages/imp-core-types/graph-model.md */

import type { TypeId, TypeParamId } from "./graph"

/** Concrete type (e.g. boolean, collection<T>). */
export interface ConcreteType {
  id: TypeId
  args?: Type[]
}

/** Reference to a type parameter declared on a NodeType or GraphType. */
export interface TypeVar {
  param: TypeParamId
}

export type Type = ConcreteType | TypeVar

export function isConcreteType(type: Type): type is ConcreteType {
  return "id" in type
}

export function isTypeVar(type: Type): type is TypeVar {
  return "param" in type
}

export function concreteType(id: TypeId, ...args: Type[]): ConcreteType {
  return args.length > 0 ? { id, args } : { id }
}

export function typeVar(param: TypeParamId): TypeVar {
  return { param }
}

export function collectionOf(element: Type): ConcreteType {
  return concreteType("collection", element)
}

export function listOf(element: Type): ConcreteType {
  return concreteType("list", element)
}

export function setOf(element: Type): ConcreteType {
  return concreteType("set", element)
}
