/** Graph instance type checking. Spec: imp-spec/docs/packages/imp-typecheck/type-system.md */

import type { Graph } from "imp-core-types"
import type { Registry } from "imp-registry"
import { getNodeDefinition } from "imp-registry"
import {
  catalogPortType,
  collectGraphSubstitution,
  effectiveNodeDefinition,
  resolvePortType,
} from "./graph-analysis"
import { type Substitution, type TypeCheckError, containsTypeVar } from "./substitution"
import { formatType, unify } from "./unify"
import { checkTypeParamBounds } from "./check-type-param-bounds"

export function checkGraph(
  graph: Graph,
  registry: Registry,
): TypeCheckError[] {
  const errors: TypeCheckError[] = []
  let subst: Substitution = new Map()

  for (const node of Object.values(graph.nodes)) {
    const definition = getNodeDefinition(registry, node.type)
    if (!definition) {
      errors.push({ nodeId: node.id, message: `unknown NodeDefinition "${node.type}"` })
      continue
    }

    if (node.typeArgs) {
      const expected = definition.typeParams?.length ?? 0
      if (node.typeArgs.length !== expected) {
        errors.push({
          nodeId: node.id,
          message: `expected ${expected} typeArgs, got ${node.typeArgs.length}`,
        })
      }
    }

    const effective = effectiveNodeDefinition(node, registry) ?? definition

    for (const [portId, port] of Object.entries(effective.inputs)) {
      const hasEdge = Object.values(graph.edges).some(
        (edge) => edge.to.node === node.id && edge.to.port === portId,
      )
      const hasLiteral = node.inputs[portId] !== undefined
      const hasDefault = port.defaultValue !== undefined
      if (!hasEdge && !hasLiteral && !hasDefault) {
        errors.push({
          nodeId: node.id,
          portId,
          message: `required input port "${portId}" is unsatisfied`,
        })
      }
    }
  }

  subst = collectGraphSubstitution(graph, registry)

  for (const edge of Object.values(graph.edges)) {
    const fromNode = graph.nodes[edge.from.node]
    const toNode = graph.nodes[edge.to.node]
    if (!fromNode || !toNode) continue

    const outputType = catalogPortType(fromNode, registry, edge.from.port, "output")
    const inputType = catalogPortType(toNode, registry, edge.to.port, "input")

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

    const result = unify(outputType, inputType, subst)
    if (!result.ok) {
      errors.push({
        nodeId: edge.to.node,
        portId: edge.to.port,
        message: result.message,
      })
    } else {
      subst = result.subst
    }
  }

  for (const node of Object.values(graph.nodes)) {
    const definition =
      effectiveNodeDefinition(node, registry) ?? getNodeDefinition(registry, node.type)
    if (!definition) continue

    for (const [portId] of Object.entries(definition.outputs)) {
      const resolved = resolvePortType(graph, node.id, portId, registry, new Map(subst))
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
      const resolved = resolvePortType(graph, node.id, portId, registry, new Map(subst))
      if (resolved && containsTypeVar(resolved)) {
        errors.push({
          nodeId: node.id,
          portId,
          message: `unresolved type parameter on input: ${formatType(resolved)}`,
        })
      }
    }
  }

  errors.push(...checkTypeParamBounds(graph, registry))

  return errors
}
