/** Type constraint libraries. Authoritative spec: imp-spec/docs/packages/imp-core-types/type-constraints.md */

import type { TypeConstraintId } from "./graph"
import type { SignalType } from "./signal-type"

/** Catalog entry listing nominal type patterns that satisfy a constraint. */
export interface TypeConstraint {
  id: TypeConstraintId
  members: SignalType[]
}

/** Named declarative collection of `TypeConstraint`s. */
export interface TypeConstraintLibrary {
  id: string
  constraints: Record<TypeConstraintId, TypeConstraint>
}
