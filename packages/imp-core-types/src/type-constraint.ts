/** Type constraint libraries. Authoritative spec: imp-spec/docs/packages/imp-core-types/type-constraints.md */

import type { TypeConstraintId } from "./graph"
import type { Type } from "./type"

/** Catalog entry listing nominal type patterns that satisfy a constraint. */
export interface TypeConstraint {
  id: TypeConstraintId
  members: Type[]
}

/** Named declarative collection of `TypeConstraint`s. */
export interface TypeConstraintLibrary {
  id: string
  constraints: Record<TypeConstraintId, TypeConstraint>
}
