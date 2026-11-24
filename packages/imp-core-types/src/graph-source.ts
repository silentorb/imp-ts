/**
 * Read-only edge / node providers that graph algorithms consume.
 * Spec: imp-spec/docs/packages/imp-core-types/graph-sources.md
 */

import type { Edge, EdgeId, Graph, Node, NodeId, PortId } from "./graph"

/** Supplies nodes by id. Whether a node is local or remote is the provider's concern. */
export interface NodeProvider {
  getNode(id: NodeId): Node | undefined
  /** Ids this provider can enumerate cheaply; omitted by non-enumerable (e.g. store-backed) providers. */
  nodeIds?(): NodeId[]
}

/** Supplies the graph's topology. */
export interface EdgeProvider {
  getEdge(id: EdgeId): Edge | undefined
  edgeEntries(): [EdgeId, Edge][]
}

/** One node provider + one edge provider — what graph algorithms accept. */
export interface GraphSource {
  nodes: NodeProvider
  edges: EdgeProvider
}

/** Node provider over a `Graph.nodes` map. */
export function nodeMapProvider(nodes: Graph["nodes"]): NodeProvider {
  return {
    getNode: (id) => (Object.hasOwn(nodes, id) ? nodes[id] : undefined),
    nodeIds: () => Object.keys(nodes),
  }
}

/** Edge provider over a `Graph.edges` map. */
export function edgeMapProvider(edges: Graph["edges"]): EdgeProvider {
  return {
    getEdge: (id) => (Object.hasOwn(edges, id) ? edges[id] : undefined),
    edgeEntries: () => Object.entries(edges),
  }
}

/** Graph source over a serialized `Graph`. */
export function graphSource(graph: Graph): GraphSource {
  return { nodes: nodeMapProvider(graph.nodes), edges: edgeMapProvider(graph.edges) }
}

/**
 * Node provider returning the first hit across `providers` in order.
 * `nodeIds` is the de-duplicated union of providers that can enumerate (omitted when none can).
 */
export function layeredNodes(...providers: NodeProvider[]): NodeProvider {
  const enumerable = providers.filter((p) => p.nodeIds !== undefined)
  const layered: NodeProvider = {
    getNode(id) {
      for (const provider of providers) {
        const node = provider.getNode(id)
        if (node) return node
      }
      return undefined
    },
  }
  if (enumerable.length > 0) {
    layered.nodeIds = () => {
      const ids = new Set<NodeId>()
      for (const provider of enumerable) {
        for (const id of provider.nodeIds!()) ids.add(id)
      }
      return [...ids]
    }
  }
  return layered
}

/** Membership: edge endpoints (first occurrence, entry order), then enumerable node ids not yet listed. */
export function graphNodeIds(source: GraphSource): NodeId[] {
  const ids = new Set<NodeId>()
  for (const [, edge] of source.edges.edgeEntries()) {
    ids.add(edge.from.node)
    ids.add(edge.to.node)
  }
  for (const id of source.nodes.nodeIds?.() ?? []) ids.add(id)
  return [...ids]
}

/** Resolved members of the source, in membership order. */
export function resolvedNodes(source: GraphSource): Node[] {
  const nodes: Node[] = []
  for (const id of graphNodeIds(source)) {
    const node = source.nodes.getNode(id)
    if (node) nodes.push(node)
  }
  return nodes
}

/** Member ids with no node from the provider. */
export function unresolvedNodeIds(source: GraphSource): NodeId[] {
  return graphNodeIds(source).filter((id) => !source.nodes.getNode(id))
}

/** Edges targeting `(nodeId, portId)`, sorted by `Edge.order` ascending (unset = 0, ties by entry order). */
export function inboundEdges(
  source: GraphSource,
  nodeId: NodeId,
  portId: PortId,
): [EdgeId, Edge][] {
  return source.edges
    .edgeEntries()
    .filter(([, edge]) => edge.to.node === nodeId && edge.to.port === portId)
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => (a.entry[1].order ?? 0) - (b.entry[1].order ?? 0) || a.index - b.index)
    .map(({ entry }) => entry)
}

/** Serialized `Graph` with every resolved member and every edge. */
export function materializeGraph(source: GraphSource): Graph {
  const nodes: Graph["nodes"] = {}
  for (const node of resolvedNodes(source)) nodes[node.id] = node
  return { nodes, edges: Object.fromEntries(source.edges.edgeEntries()) }
}
