export type { Substitution, TypeCheckError } from "./substitution"
export {
  scopedParam,
  scopeType,
  applySubstitution,
  isAnyType,
  containsTypeVar,
  canonicalUnion,
  typesEqual,
} from "./substitution"
export { unify, formatType } from "./unify"
export type { UnifyResult } from "./unify"
export { isSubtypeId } from "./subtype"
export { assignable } from "./assignable"
export type { AssignableResult } from "./assignable"
export {
  instantiateNodeDefinition,
  instantiateNodeDefinition as instantiateNodeType,
} from "./instantiate"
export {
  resolvePortType,
  collectGraphSubstitution,
  effectiveNodeDefinition,
  effectiveNodeDefinition as effectiveNodeType,
  catalogPortType,
  checkGraph,
  checkDefinition,
  checkGraphDefinitions,
} from "./check"
export { checkTypeParamBounds } from "./check-type-param-bounds"
export { checkTypeDefinitions, typeReferenceProblems } from "./check-type-definitions"
export { normalizeType, normalizeDefinition, normalizedRegistry } from "./normalize"
export { resolveTypeArgs } from "./resolve-type-args"
export {
  effectiveNodeImplementation,
  typeMatches,
  resolveImplementation,
} from "./resolve-implementation"
export type { ImplementationResolveError } from "./resolve-implementation"
