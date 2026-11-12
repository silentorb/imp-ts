/** Input resolution for imp-execution (aligned with imp-sql). */

import type {
  Edge,
  Graph,
  Node,
  NodeDefinition,
  NodeId,
  PortId,
  PortReference,
  PrimitiveValue,
} from "imp-core-types";
import type { Registry } from "imp-registry";
import { getNodeDefinitions } from "imp-registry";

export type EdgeTargetKey = `${NodeId}\0${PortId}`;

export function edgeTargetKey(node: NodeId, port: PortId): EdgeTargetKey {
  return `${node}\0${port}`;
}

/** Index inbound edges by target. Values are arrays (length > 1 only for variadic ports). */
export function indexEdgesByTarget(graph: Graph): Map<EdgeTargetKey, Edge[]> {
  const map = new Map<EdgeTargetKey, Edge[]>();
  for (const edge of Object.values(graph.edges)) {
    const key = edgeTargetKey(edge.to.node, edge.to.port);
    const list = map.get(key);
    if (list) {
      list.push(edge);
    } else {
      map.set(key, [edge]);
    }
  }
  return map;
}

export function requireNode(graph: Graph, nodeId: NodeId): Node {
  const node = graph.nodes[nodeId];
  if (node == null) {
    throw new Error(`Unknown node "${nodeId}"`);
  }
  return node;
}

export function requireNodeDefinition(registry: Registry, typeId: string): NodeDefinition {
  const overloads = getNodeDefinitions(registry, typeId);
  if (overloads.length === 0) {
    throw new Error(`Unknown node type "${typeId}"`);
  }
  // Overloads share port names/defaults; first signature is enough for defaultValue lookup.
  return overloads[0]!;
}

/** @deprecated Use requireNodeDefinition */
export const requireNodeType = requireNodeDefinition;

export function findSoleBoundaryNode(graph: Graph, typeId: "input" | "output"): Node {
  const matches = Object.values(graph.nodes).filter((n) => n.type === typeId);
  if (matches.length === 0) {
    throw new Error(`Graph has no "${typeId}" boundary node`);
  }
  if (matches.length > 1) {
    throw new Error(
      `Graph has ${matches.length} "${typeId}" nodes; pass explicit source/sink`,
    );
  }
  return matches[0]!;
}

export function defaultSource(graph: Graph): PortReference {
  const node = findSoleBoundaryNode(graph, "input");
  return { node: node.id, port: "value" };
}

export function defaultSink(graph: Graph): PortReference {
  const node = findSoleBoundaryNode(graph, "output");
  return { node: node.id, port: "value" };
}

export type ResolvedLiteral = { kind: "literal"; value: PrimitiveValue };
export type ResolvedWire = { kind: "wire"; from: PortReference };
export type ResolvedInput = ResolvedLiteral | ResolvedWire;

export function resolveInput(
  graph: Graph,
  registry: Registry,
  edgesByTarget: Map<EdgeTargetKey, Edge[]>,
  nodeId: NodeId,
  portId: PortId,
): ResolvedInput {
  const edges = edgesByTarget.get(edgeTargetKey(nodeId, portId)) ?? [];
  if (edges.length > 1) {
    throw new Error(
      `Multiple edges target ${nodeId}.${portId}; use resolveVariadicInputs for variadic ports`,
    );
  }
  if (edges.length === 1) {
    return { kind: "wire", from: edges[0]!.from };
  }

  const node = requireNode(graph, nodeId);
  if (Object.prototype.hasOwnProperty.call(node.inputs, portId)) {
    return { kind: "literal", value: node.inputs[portId]! };
  }

  const definition = requireNodeDefinition(registry, node.type);
  const port = definition.inputs[portId];
  if (port == null) {
    throw new Error(`Node "${nodeId}" (type "${node.type}") has no input port "${portId}"`);
  }
  if (port.defaultValue !== undefined) {
    return { kind: "literal", value: port.defaultValue };
  }

  throw new Error(
    `Required input "${nodeId}.${portId}" is unsatisfied (no edge, local value, or default)`,
  );
}

/** Resolve a variadic input: inbound edges sorted by Edge.order ascending. */
export function resolveVariadicInputs(
  edgesByTarget: Map<EdgeTargetKey, Edge[]>,
  nodeId: NodeId,
  portId: PortId,
): ResolvedWire[] {
  const edges = [...(edgesByTarget.get(edgeTargetKey(nodeId, portId)) ?? [])];
  edges.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return edges.map((edge) => ({ kind: "wire" as const, from: edge.from }));
}
