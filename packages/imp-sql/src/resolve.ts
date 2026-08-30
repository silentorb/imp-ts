/** Input resolution and graph indexing for SQL lowering. Spec: docs/features/sql.md */

import type {
  Edge,
  Graph,
  Node,
  NodeId,
  NodeType,
  PortId,
  PortReference,
  PrimitiveValue,
} from "imp-core-types"
import type { Registry } from "imp-registry"
import { getNodeType } from "imp-registry"

export type EdgeTargetKey = `${NodeId}\0${PortId}`

export function edgeTargetKey(node: NodeId, port: PortId): EdgeTargetKey {
  return `${node}\0${port}`
}

export function indexEdgesByTarget(graph: Graph): Map<EdgeTargetKey, Edge> {
  const map = new Map<EdgeTargetKey, Edge>()
  for (const edge of Object.values(graph.edges)) {
    const key = edgeTargetKey(edge.to.node, edge.to.port)
    if (map.has(key)) {
      throw new Error(
        `Multiple edges target ${edge.to.node}.${edge.to.port}; expected at most one`,
      )
    }
    map.set(key, edge)
  }
  return map
}

export function requireNode(graph: Graph, nodeId: NodeId): Node {
  const node = graph.nodes[nodeId]
  if (node == null) {
    throw new Error(`Unknown node "${nodeId}"`)
  }
  return node
}

export function requireNodeType(registry: Registry, typeId: string): NodeType {
  const nodeType = getNodeType(registry, typeId)
  if (nodeType == null) {
    throw new Error(`Unknown node type "${typeId}"`)
  }
  return nodeType
}

export function findSoleBoundaryNode(
  graph: Graph,
  typeId: "input" | "output",
): Node {
  const matches = Object.values(graph.nodes).filter((n) => n.type === typeId)
  if (matches.length === 0) {
    throw new Error(`Graph has no "${typeId}" boundary node`)
  }
  if (matches.length > 1) {
    throw new Error(
      `Graph has ${matches.length} "${typeId}" nodes; pass explicit source/sink`,
    )
  }
  return matches[0]!
}

export function defaultSource(graph: Graph): PortReference {
  const node = findSoleBoundaryNode(graph, "input")
  return { node: node.id, port: "value" }
}

export function defaultSink(graph: Graph): PortReference {
  const node = findSoleBoundaryNode(graph, "output")
  return { node: node.id, port: "value" }
}

export type ResolvedLiteral = { kind: "literal"; value: PrimitiveValue }
export type ResolvedWire = { kind: "wire"; from: PortReference }
export type ResolvedInput = ResolvedLiteral | ResolvedWire

/**
 * Resolve an input port: edge → local literal → catalog defaultValue → error.
 */
export function resolveInput(
  graph: Graph,
  registry: Registry,
  edgesByTarget: Map<EdgeTargetKey, Edge>,
  nodeId: NodeId,
  portId: PortId,
): ResolvedInput {
  const edge = edgesByTarget.get(edgeTargetKey(nodeId, portId))
  if (edge != null) {
    return { kind: "wire", from: edge.from }
  }

  const node = requireNode(graph, nodeId)
  if (Object.prototype.hasOwnProperty.call(node.inputs, portId)) {
    return { kind: "literal", value: node.inputs[portId]! }
  }

  const nodeType = requireNodeType(registry, node.type)
  const port = nodeType.inputs[portId]
  if (port == null) {
    throw new Error(`Node "${nodeId}" (type "${node.type}") has no input port "${portId}"`)
  }
  if (port.defaultValue !== undefined) {
    return { kind: "literal", value: port.defaultValue }
  }

  throw new Error(
    `Required input "${nodeId}.${portId}" is unsatisfied (no edge, local value, or default)`,
  )
}
