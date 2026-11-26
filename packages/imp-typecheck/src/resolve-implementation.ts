/** Implementation resolution from type arguments. Spec: imp-spec/docs/packages/imp-typecheck/type-system.md */

import type {
  GraphSource,
  ImplementationId,
  NodeDefinition,
  NodeImplementation,
  Type,
} from "imp-core-types"
import {
  defaultNodeImplementation,
  isDispatchImplementation,
  isGraphBackedDefinition,
  isUniversalImplementation,
} from "imp-core-types"
import type { Registry } from "imp-registry"
import { resolveSelections } from "./graph-analysis"
import { resolveTypeArgs } from "./resolve-type-args"
import { assignable } from "./assignable"
import { prepare } from "./normalize"

export interface ImplementationResolveError {
  nodeId?: string
  message: string
}

export function effectiveNodeImplementation(
  definition: NodeDefinition,
): NodeImplementation {
  return definition.implementation ?? defaultNodeImplementation(definition.id)
}

/**
 * Whether a (normalized) type argument matches a dispatch or bound pattern: it is assignable to
 * the pattern. `{ id: "any" }` matches every type; a union pattern matches any of its members.
 */
export function typeMatches(pattern: Type, type: Type): boolean {
  return assignable(type, pattern).ok
}

export function resolveImplementation(
  source: GraphSource,
  nodeId: string,
  registry: Registry,
): ImplementationId | ImplementationResolveError {
  ({ source, registry } = prepare(source, registry))
  const node = source.nodes.getNode(nodeId)
  if (!node) {
    return { message: `unknown node "${nodeId}"` }
  }

  const { selected: selectedDefs } = resolveSelections(source, registry)
  const definition = selectedDefs.get(nodeId)
  if (!definition) {
    return { nodeId, message: `unknown or unresolved NodeDefinition "${node.type}"` }
  }

  if (isGraphBackedDefinition(definition)) {
    return { nodeId, message: `graph-backed definition "${node.type}" has no implementation id` }
  }

  const implementation = effectiveNodeImplementation(definition)

  if (isUniversalImplementation(implementation)) {
    return implementation.id
  }

  if (!isDispatchImplementation(implementation)) {
    return { nodeId, message: "invalid NodeDefinition implementation shape" }
  }

  const typeArgs = resolveTypeArgs(source, nodeId, registry, selectedDefs)
  if (!typeArgs) {
    return {
      nodeId,
      message: "cannot resolve type arguments for dispatched implementation",
    }
  }

  const paramIndex = implementation.paramIndex ?? 0
  const matchedArg = typeArgs[paramIndex]
  if (!matchedArg) {
    return {
      nodeId,
      message: `dispatch paramIndex ${paramIndex} out of range (${typeArgs.length} type args)`,
    }
  }

  for (const caseEntry of implementation.cases) {
    if (typeMatches(caseEntry.match, matchedArg)) {
      return caseEntry.implementation
    }
  }

  if (implementation.default) {
    return implementation.default
  }

  return {
    nodeId,
    message: `no implementation case matches resolved type argument`,
  }
}
