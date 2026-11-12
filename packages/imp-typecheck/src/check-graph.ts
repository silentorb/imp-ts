/** Graph instance type checking. Spec: imp-spec/docs/packages/imp-typecheck/type-system.md */

import type { Graph } from "imp-core-types"
import type { Registry } from "imp-registry"
import { getNodeDefinitions } from "imp-registry"
import {
  candidateSurvives,
  catalogPortTypeFromDefinition,
  effectiveDefinition,
  resolvePortType,
  resolveSelections,
} from "./graph-analysis"
import { type TypeCheckError, containsTypeVar } from "./substitution"
import { assignable } from "./assignable"
import { formatType } from "./unify"
import { checkTypeParamBounds } from "./check-type-param-bounds"

export function checkGraph(graph: Graph, registry: Registry): TypeCheckError[] {
  const errors: TypeCheckError[] = []
  const { selected, subst, unknownTypes } = resolveSelections(graph, registry)

  for (const nodeId of unknownTypes) {
    const node = graph.nodes[nodeId]!
    errors.push({ nodeId, message: `unknown NodeDefinition "${node.type}"` })
  }

  for (const node of Object.values(graph.nodes)) {
    if (unknownTypes.includes(node.id)) continue
    const overloads = getNodeDefinitions(registry, node.type)
    if (overloads.length === 0) continue

    if (!selected.has(node.id)) {
      const survivors = overloads.filter(
        (candidate) =>
          candidateSurvives(graph, node.id, candidate, registry, selected, subst).ok,
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
      const inbound = Object.entries(graph.edges).filter(
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
  for (const edge of Object.values(graph.edges)) {
    const fromNode = graph.nodes[edge.from.node]
    const toNode = graph.nodes[edge.to.node]
    if (!fromNode || !toNode) continue

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
        message: result.message,
      })
    } else {
      edgeSubst = result.subst
    }
  }

  for (const node of Object.values(graph.nodes)) {
    const definition = selected.get(node.id)
    if (!definition) continue

    for (const [portId] of Object.entries(definition.outputs)) {
      const resolved = resolvePortType(
        graph,
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
      const hasEdge = Object.values(graph.edges).some(
        (e) => e.to.node === node.id && e.to.port === portId,
      )
      if (!hasEdge) continue
      const resolved = resolvePortType(
        graph,
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

  errors.push(...checkTypeParamBounds(graph, registry, selected))

  return errors
}
