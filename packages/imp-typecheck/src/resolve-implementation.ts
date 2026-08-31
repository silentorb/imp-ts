/** Implementation resolution from type arguments. Spec: imp-spec/docs/packages/imp-typecheck/type-system.md */

import type {
  ConcreteSignalType,
  Graph,
  ImplementationId,
  NodeImplementation,
  NodeType,
  SignalType,
} from "imp-core-types"
import {
  defaultNodeImplementation,
  isConcreteSignalType,
  isDispatchImplementation,
  isUniversalImplementation,
} from "imp-core-types"
import type { Registry } from "imp-registry"
import { getNodeType } from "imp-registry"
import { resolveTypeArgs } from "./resolve-type-args"

export interface ImplementationResolveError {
  nodeId?: string
  message: string
}

export function effectiveNodeImplementation(nodeType: NodeType): NodeImplementation {
  return nodeType.implementation ?? defaultNodeImplementation(nodeType.id)
}

export function signalTypeMatches(pattern: ConcreteSignalType, type: SignalType): boolean {
  if (!isConcreteSignalType(type)) return false
  if (pattern.id === "any") return true

  if (pattern.id !== type.id) return false

  const patternArgs = pattern.args ?? []
  const typeArgs = type.args ?? []
  if (patternArgs.length !== typeArgs.length) return false

  for (let i = 0; i < patternArgs.length; i++) {
    const patternArg = patternArgs[i]!
    if (!isConcreteSignalType(patternArg)) return false
    if (!signalTypeMatches(patternArg, typeArgs[i]!)) return false
  }

  return true
}

export function resolveImplementation(
  graph: Graph,
  nodeId: string,
  registry: Registry,
): ImplementationId | ImplementationResolveError {
  const node = graph.nodes[nodeId]
  if (!node) {
    return { message: `unknown node "${nodeId}"` }
  }

  const nodeType = getNodeType(registry, node.type)
  if (!nodeType) {
    return { nodeId, message: `unknown NodeType "${node.type}"` }
  }

  const implementation = effectiveNodeImplementation(nodeType)

  if (isUniversalImplementation(implementation)) {
    return implementation.id
  }

  if (!isDispatchImplementation(implementation)) {
    return { nodeId, message: "invalid NodeType implementation shape" }
  }

  const typeArgs = resolveTypeArgs(graph, nodeId, registry)
  if (!typeArgs) {
    return {
      nodeId,
      message: "cannot resolve type arguments for dispatched implementation",
    }
  }

  const paramIndex = implementation.paramIndex ?? 0
  const selected = typeArgs[paramIndex]
  if (!selected) {
    return {
      nodeId,
      message: `dispatch paramIndex ${paramIndex} out of range (${typeArgs.length} type args)`,
    }
  }

  for (const caseEntry of implementation.cases) {
    if (signalTypeMatches(caseEntry.match, selected)) {
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
