/** Graph instance type checking. Spec: imp-spec/docs/packages/imp-typecheck/type-system.md */

import type { Edge, GraphSource, Node, NodeDefinition, SignalType } from "imp-core-types"
import { isTypeVar, resolvedNodes } from "imp-core-types"
import type { Registry } from "imp-registry"
import { getNodeDefinitions } from "imp-registry"
import {
  candidateSurvives,
  catalogPortTypeFromDefinition,
  effectiveDefinition,
  resolvePortType,
  resolveSelections,
} from "./graph-analysis"
import {
  type Substitution,
  type TypeCheckError,
  applySubstitution,
  containsTypeVar,
  scopeSignalType,
  unscopedParam,
} from "./substitution"
import { assignable } from "./assignable"
import { formatType } from "./unify"
import { checkTypeParamBounds } from "./check-type-param-bounds"

export function checkGraph(source: GraphSource, registry: Registry): TypeCheckError[] {
  const errors: TypeCheckError[] = []
  const { selected, subst, unknownTypes } = resolveSelections(source, registry)

  for (const nodeId of unknownTypes) {
    const node = source.nodes.getNode(nodeId)!
    errors.push({ nodeId, message: `unknown NodeDefinition "${node.type}"` })
  }

  for (const node of resolvedNodes(source)) {
    if (unknownTypes.includes(node.id)) continue
    const overloads = getNodeDefinitions(registry, node.type)
    if (overloads.length === 0) continue

    if (!selected.has(node.id)) {
      const survivors = overloads.filter(
        (candidate) =>
          candidateSurvives(source, node.id, candidate, registry, selected, subst).ok,
      )
      if (survivors.length === 0) {
        errors.push({
          nodeId: node.id,
          message: `no matching overload for "${node.type}"`,
        })
      } else {
        errors.push({
          nodeId: node.id,
          message: `ambiguous overload for "${node.type}" (${survivors.length} candidates)`,
        })
      }
      continue
    }

    const definition = selected.get(node.id)!
    if (node.typeArgs) {
      const expected = definition.typeParams?.length ?? 0
      if (node.typeArgs.length !== expected) {
        errors.push({
          nodeId: node.id,
          message: `expected ${expected} typeArgs, got ${node.typeArgs.length}`,
        })
      }
    }

    const effective = effectiveDefinition(node, definition)
    for (const [portId, port] of Object.entries(effective.inputs)) {
      const inbound = source.edges.edgeEntries().filter(
        ([, edge]) => edge.to.node === node.id && edge.to.port === portId,
      )
      const hasEdge = inbound.length > 0
      const hasLiteral = node.inputs[portId] !== undefined
      const hasDefault = port.defaultValue !== undefined

      if (port.variadic) {
        if (inbound.length === 0 && !hasDefault) {
          errors.push({
            nodeId: node.id,
            portId,
            message: `required input port "${portId}" is unsatisfied`,
          })
        }
        const orders = new Map<number, string>()
        for (const [edgeId, edge] of inbound) {
          if (edge.order === undefined) {
            errors.push({
              nodeId: node.id,
              portId,
              message: `variadic input "${portId}" requires Edge.order on edge "${edgeId}"`,
            })
            continue
          }
          const prior = orders.get(edge.order)
          if (prior !== undefined) {
            errors.push({
              nodeId: node.id,
              portId,
              message: `duplicate Edge.order ${edge.order} on variadic input "${portId}" (edges "${prior}" and "${edgeId}")`,
            })
          } else {
            orders.set(edge.order, edgeId)
          }
        }
      } else {
        if (inbound.length > 1) {
          errors.push({
            nodeId: node.id,
            portId,
            message: `multiple edges target non-variadic input "${portId}"`,
          })
        }
        if (!hasEdge && !hasLiteral && !hasDefault) {
          errors.push({
            nodeId: node.id,
            portId,
            message: `required input port "${portId}" is unsatisfied`,
          })
        }
      }
    }
  }

  let edgeSubst = subst
  for (const [, edge] of source.edges.edgeEntries()) {
    const fromNode = source.nodes.getNode(edge.from.node)
    if (!fromNode) {
      errors.push({ nodeId: edge.from.node, message: `unknown node "${edge.from.node}"` })
      continue
    }
    const toNode = source.nodes.getNode(edge.to.node)
    if (!toNode) {
      errors.push({ nodeId: edge.to.node, message: `unknown node "${edge.to.node}"` })
      continue
    }

    const fromDef = selected.get(fromNode.id)
    const toDef = selected.get(toNode.id)
    if (!fromDef || !toDef) continue

    const outputType = catalogPortTypeFromDefinition(
      fromNode,
      fromDef,
      edge.from.port,
      "output",
    )
    const inputType = catalogPortTypeFromDefinition(toNode, toDef, edge.to.port, "input")

    if (!outputType) {
      errors.push({
        nodeId: edge.from.node,
        portId: edge.from.port,
        message: "unknown output port",
      })
      continue
    }
    if (!inputType) {
      errors.push({
        nodeId: edge.to.node,
        portId: edge.to.port,
        message: "unknown input port",
      })
      continue
    }

    // Variadic catalog type is the element type; assignability is still element → element.
    const result = assignable(outputType, inputType, edgeSubst)
    if (!result.ok) {
      errors.push({
        nodeId: edge.to.node,
        portId: edge.to.port,
        message:
          typeParamConflict(source, toNode, toDef, edge, outputType, inputType, edgeSubst) ??
          result.message,
      })
    } else {
      edgeSubst = result.subst
    }
  }

  for (const node of resolvedNodes(source)) {
    const definition = selected.get(node.id)
    if (!definition) continue

    for (const [portId] of Object.entries(definition.outputs)) {
      const resolved = resolvePortType(
        source,
        node.id,
        portId,
        registry,
        new Map(edgeSubst),
        selected,
      )
      if (resolved && containsTypeVar(resolved)) {
        errors.push({
          nodeId: node.id,
          portId,
          message: `unresolved type parameter on output: ${formatType(resolved)}`,
        })
      }
    }

    for (const [portId] of Object.entries(definition.inputs)) {
      const hasEdge = source.edges
        .edgeEntries()
        .some(([, e]) => e.to.node === node.id && e.to.port === portId)
      if (!hasEdge) continue
      const resolved = resolvePortType(
        source,
        node.id,
        portId,
        registry,
        new Map(edgeSubst),
        selected,
      )
      if (resolved && containsTypeVar(resolved)) {
        errors.push({
          nodeId: node.id,
          portId,
          message: `unresolved type parameter on input: ${formatType(resolved)}`,
        })
      }
    }
  }

  errors.push(...checkTypeParamBounds(source, registry, selected))

  return errors
}

/**
 * Describes a failed edge whose target port is a type parameter already bound through another
 * input of the same node: names the parameter, both types and both ports.
 */
function typeParamConflict(
  source: GraphSource,
  toNode: Node,
  toDef: NodeDefinition,
  edge: Edge,
  outputType: SignalType,
  inputType: SignalType,
  subst: Substitution,
): string | undefined {
  if (!isTypeVar(inputType)) return undefined
  const bound = applySubstitution(inputType, subst)
  if (containsTypeVar(bound)) return undefined
  const incoming = applySubstitution(outputType, subst)
  const effective = effectiveDefinition(toNode, toDef)
  let otherPort: string | undefined
  for (const [, other] of source.edges.edgeEntries()) {
    if (other.to.node !== toNode.id) continue
    const sameEdge =
      other.to.port === edge.to.port &&
      other.from.node === edge.from.node &&
      other.from.port === edge.from.port
    if (sameEdge) continue
    const port = effective.inputs[other.to.port]
    if (!port) continue
    const scoped = scopeSignalType(port.type, toNode.id)
    if (isTypeVar(scoped) && scoped.param === inputType.param) {
      otherPort = other.to.port
      break
    }
  }
  const origin = otherPort === undefined ? "" : ` (from input ${otherPort})`
  return `type parameter ${unscopedParam(inputType.param)} is ${formatType(bound)}${origin} but input ${edge.to.port} receives ${formatType(incoming)}`
}
