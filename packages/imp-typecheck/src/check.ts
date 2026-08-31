/** Graph type checking. Spec: imp-spec/docs/packages/imp-typecheck/type-system.md */

import type { Graph, GraphType, GraphTypeId, PortId, SignalType } from "imp-core-types"
import type { Registry } from "imp-registry"
import { getGraphType, getNodeType } from "imp-registry"
import {
  catalogPortType,
  collectGraphSubstitution,
  effectiveNodeType,
  resolvePortType,
} from "./graph-analysis"
import {
  type Substitution,
  type TypeCheckError,
  containsTypeVar,
  scopeSignalType,
} from "./substitution"
import { formatType, unify } from "./unify"

export { resolvePortType, collectGraphSubstitution, effectiveNodeType, catalogPortType }

export function checkGraph(
  graph: Graph,
  registry: Registry,
): TypeCheckError[] {
  const errors: TypeCheckError[] = []
  let subst: Substitution = new Map()

  for (const node of Object.values(graph.nodes)) {
    const nodeType = getNodeType(registry, node.type)
    if (!nodeType) {
      errors.push({ nodeId: node.id, message: `unknown NodeType "${node.type}"` })
      continue
    }

    if (node.typeArgs) {
      const expected = nodeType.typeParams?.length ?? 0
      if (node.typeArgs.length !== expected) {
        errors.push({
          nodeId: node.id,
          message: `expected ${expected} typeArgs, got ${node.typeArgs.length}`,
        })
      }
    }

    const effective = effectiveNodeType(node, registry) ?? nodeType

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
    const nodeType = effectiveNodeType(node, registry) ?? getNodeType(registry, node.type)
    if (!nodeType) continue

    for (const [portId] of Object.entries(nodeType.outputs)) {
      const resolved = resolvePortType(graph, node.id, portId, registry, new Map(subst))
      if (resolved && containsTypeVar(resolved)) {
        errors.push({
          nodeId: node.id,
          portId,
          message: `unresolved type parameter on output: ${formatType(resolved)}`,
        })
      }
    }

    for (const [portId] of Object.entries(nodeType.inputs)) {
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

  return errors
}

export function checkGraphImplements(
  graph: Graph,
  graphTypeId: GraphTypeId,
  registry: Registry,
): TypeCheckError[] {
  const graphType = getGraphType(registry, graphTypeId)
  if (!graphType) {
    return [{ message: `unknown GraphType "${graphTypeId}"` }]
  }

  const errors: TypeCheckError[] = []
  const subst: Substitution = new Map()

  const inputNodes = Object.values(graph.nodes).filter((n) => n.type === "input")
  const outputNodes = Object.values(graph.nodes).filter((n) => n.type === "output")

  for (const portId of Object.keys(graphType.inputs) as PortId[]) {
    const port = graphType.inputs[portId]!
    const boundary = inputNodes.find((node) => {
      const resolved = resolvePortType(graph, node.id, "value", registry, subst)
      return resolved !== undefined
    })
    if (!boundary) {
      errors.push({ portId, message: `missing boundary input for GraphType port "${portId}"` })
      continue
    }
    const boundaryType = resolvePortType(graph, boundary.id, "value", registry, subst)
    if (!boundaryType) continue
    const expected = scopeGraphTypePort(port.type, graphType)
    const result = unify(boundaryType, expected, subst)
    if (!result.ok) {
      errors.push({
        nodeId: boundary.id,
        portId: "value",
        message: result.message,
      })
    }
  }

  for (const portId of Object.keys(graphType.outputs) as PortId[]) {
    const port = graphType.outputs[portId]!
    const boundary = outputNodes.find((node) => {
      const nodeType = getNodeType(registry, node.type)
      return nodeType?.inputs.value !== undefined
    })
    if (!boundary) {
      errors.push({ portId, message: `missing boundary output for GraphType port "${portId}"` })
      continue
    }
    const boundaryType = catalogPortType(boundary, registry, "value", "input")
    if (!boundaryType) continue
    const expected = scopeGraphTypePort(port.type, graphType)
    const result = unify(boundaryType, expected, subst)
    if (!result.ok) {
      errors.push({
        nodeId: boundary.id,
        portId: "value",
        message: result.message,
      })
    }
  }

  return errors
}

function scopeGraphTypePort(type: SignalType, graphType: GraphType): SignalType {
  const scopeId = `__graph__${graphType.id}`
  return scopeSignalType(type, scopeId)
}
