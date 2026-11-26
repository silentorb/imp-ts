/** Type helpers. Spec: imp-spec/docs/packages/imp-core-types/graph-model.md */

import type { TypeId, TypeParamId } from "./graph"

/** Concrete type (e.g. boolean, collection<T>), or a reference to a type definition. */
export interface ConcreteType {
  id: TypeId
  args?: Type[]
}

/** Reference to a type parameter declared on a NodeDefinition or TypeDefinition. */
export interface TypeVar {
  param: TypeParamId
}

/** A value of exactly one of `union`'s member types (no runtime tag says which). */
export interface UnionType {
  union: Type[]
}

export type Type = ConcreteType | TypeVar | UnionType

export function isConcreteType(type: Type): type is ConcreteType {
  return "id" in type
}

export function isTypeVar(type: Type): type is TypeVar {
  return "param" in type
}

export function isUnionType(type: Type): type is UnionType {
  return "union" in type
}

export function concreteType(id: TypeId, ...args: Type[]): ConcreteType {
  return args.length > 0 ? { id, args } : { id }
}

export function typeVar(param: TypeParamId): TypeVar {
  return { param }
}

export function unionOf(...members: Type[]): UnionType {
  return { union: members }
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

/** Direct child types of `type` (concrete args or union members). */
export function childTypes(type: Type): readonly Type[] {
  if (isConcreteType(type)) return type.args ?? []
  if (isUnionType(type)) return type.union
  return []
}

/** Rebuilds `type` with each direct child replaced by `map(child)`; variables are returned as-is. */
export function mapChildTypes(type: Type, map: (child: Type) => Type): Type {
  if (isConcreteType(type)) {
    return type.args?.length ? { id: type.id, args: type.args.map(map) } : type
  }
  if (isUnionType(type)) return { union: type.union.map(map) }
  return type
}
