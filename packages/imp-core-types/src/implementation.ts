/** Node implementation dispatch. Spec: imp-spec/docs/packages/imp-core-types/node-libraries.md */

import type { ConcreteSignalType } from "./signal-type"
import type { NodeTypeId } from "./graph"

export type ImplementationId = string

/** One dispatch case: match a concrete type pattern to an implementation id. */
export interface ImplementationCase {
  /** Pattern to match; `{ id: "any" }` matches any concrete type. */
  match: ConcreteSignalType
  implementation: ImplementationId
}

/** Single implementation for all type instantiations. */
export interface UniversalNodeImplementation {
  kind: "universal"
  id: ImplementationId
}

/** Select implementation from resolved type arguments. */
export interface DispatchNodeImplementation {
  kind: "dispatch"
  /** Index into resolved type args (default `0`). */
  paramIndex?: number
  cases: ImplementationCase[]
  /** Used when no case matches. */
  default?: ImplementationId
}

export type NodeImplementation = UniversalNodeImplementation | DispatchNodeImplementation

export function universalImplementation(id: ImplementationId): UniversalNodeImplementation {
  return { kind: "universal", id }
}

export function dispatchImplementation(
  cases: ImplementationCase[],
  options?: { paramIndex?: number; default?: ImplementationId },
): DispatchNodeImplementation {
  return {
    kind: "dispatch",
    paramIndex: options?.paramIndex,
    cases,
    default: options?.default,
  }
}

export function defaultNodeImplementation(nodeTypeId: NodeTypeId): UniversalNodeImplementation {
  return universalImplementation(nodeTypeId)
}

export function isUniversalImplementation(
  implementation: NodeImplementation,
): implementation is UniversalNodeImplementation {
  return implementation.kind === "universal"
}

export function isDispatchImplementation(
  implementation: NodeImplementation,
): implementation is DispatchNodeImplementation {
  return implementation.kind === "dispatch"
}
