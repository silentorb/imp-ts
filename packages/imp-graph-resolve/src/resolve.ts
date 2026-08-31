/** Late nested graph resolution. Spec: imp-spec/docs/packages/imp-graph-resolve/resolve.md */

import type { Edge, Graph, NodeDefinition, NodeId, PortId, SignalType } from "imp-core-types"
import { isGraphBackedDefinition } from "imp-core-types"
import type { Registry } from "imp-registry"
import { getNodeDefinition } from "imp-registry"
import { instantiateNodeDefinition } from "imp-typecheck"

export type SubgraphKey = string

export interface ExecutionProgram {
  root: Graph
  subgraphs: ReadonlyMap<SubgraphKey, Graph>
}

export function subgraphKey(definitionId: string, typeArgs?: SignalType[]): SubgraphKey {
  return `${definitionId}::${JSON.stringify(typeArgs ?? [])}`
}

function prefixId(instanceId: NodeId, innerId: NodeId): NodeId {
  return `${instanceId}::${innerId}`
}

function isCompositeNode(nodeType: string, registry: Registry): boolean {
  const def = getNodeDefinition(registry, nodeType)
  return def !== undefined && isGraphBackedDefinition(def)
}

function findCompositeNodes(graph: Graph, registry: Registry): NodeId[] {
  return Object.values(graph.nodes)
    .filter((node) => isCompositeNode(node.type, registry))
    .map((node) => node.id)
}

function resolveDefinition(node: Graph["nodes"][string], registry: Registry): NodeDefinition {
  const def = getNodeDefinition(registry, node.type)
  if (!def?.body || !def.bindings) {
    throw new Error(`Node "${node.id}" type "${node.type}" is not a graph-backed definition`)
  }
  if (node.typeArgs?.length) {
    return instantiateNodeDefinition(def, node.typeArgs)
  }
  return def
}

function edgesFromBoundaryOutput(body: Graph, boundaryNodeId: NodeId): Edge[] {
  return Object.values(body.edges).filter(
    (edge) => edge.from.node === boundaryNodeId && edge.from.port === "value",
  )
}

function edgesToBoundaryInput(body: Graph, boundaryNodeId: NodeId): Edge[] {
  return Object.values(body.edges).filter(
    (edge) => edge.to.node === boundaryNodeId,
  )
}

function expandCompositeInstance(graph: Graph, instanceId: NodeId, registry: Registry): Graph {
  const instance = graph.nodes[instanceId]
  if (!instance) {
    throw new Error(`Unknown composite instance "${instanceId}"`)
  }

  const definition = resolveDefinition(instance, registry)
  const body = definition.body!
  const bindings = definition.bindings!
  const prefix = `${instanceId}::`

  const nodes: Graph["nodes"] = { ...graph.nodes }
  delete nodes[instanceId]

  for (const [id, node] of Object.entries(body.nodes)) {
    const prefixedId = prefixId(instanceId, id)
    nodes[prefixedId] = { ...node, id: prefixedId }
  }

  const edges: Graph["edges"] = {}
  let edgeCounter = 0
  const addEdge = (from: Edge["from"], to: Edge["to"]) => {
    edges[`${prefix}edge${edgeCounter++}`] = { from, to }
  }

  for (const edge of Object.values(graph.edges)) {
    if (edge.from.node === instanceId || edge.to.node === instanceId) {
      continue
    }
    addEdge(edge.from, edge.to)
  }

  for (const edge of Object.values(body.edges)) {
    addEdge(
      { node: prefixId(instanceId, edge.from.node), port: edge.from.port },
      { node: prefixId(instanceId, edge.to.node), port: edge.to.port },
    )
  }

  for (const edge of Object.values(graph.edges)) {
    if (edge.to.node !== instanceId) continue
    const inputPort = edge.to.port as PortId
    const boundaryId = bindings.inputs[inputPort]
    if (!boundaryId) {
      throw new Error(`Composite "${instanceId}" missing input binding for port "${inputPort}"`)
    }
    const outbound = edgesFromBoundaryOutput(body, boundaryId)
    if (outbound.length === 0) {
      throw new Error(
        `Bound input "${boundaryId}" in definition "${definition.id}" has no outbound edges`,
      )
    }
    const prefixedBoundary = prefixId(instanceId, boundaryId)
    delete nodes[prefixedBoundary]
    for (const bodyEdge of outbound) {
      addEdge(edge.from, {
        node: prefixId(instanceId, bodyEdge.to.node),
        port: bodyEdge.to.port,
      })
    }
    for (const [edgeId, existing] of Object.entries(edges)) {
      if (existing.from.node === prefixedBoundary) {
        delete edges[edgeId]
      }
    }
  }

  for (const edge of Object.values(graph.edges)) {
    if (edge.from.node !== instanceId) continue
    const outputPort = edge.from.port as PortId
    const boundaryId = bindings.outputs[outputPort]
    if (!boundaryId) {
      throw new Error(`Composite "${instanceId}" missing output binding for port "${outputPort}"`)
    }
    const inbound = edgesToBoundaryInput(body, boundaryId)
    const valueInbound = inbound.find((e) => e.to.port === "value")
    if (!valueInbound) {
      throw new Error(
        `Bound output "${boundaryId}" in definition "${definition.id}" has no inbound value edge`,
      )
    }
    addEdge(
      { node: prefixId(instanceId, valueInbound.from.node), port: valueInbound.from.port },
      edge.to,
    )
  }

  return { nodes, edges }
}

export function flattenGraph(graph: Graph, registry: Registry): Graph {
  let current = graph
  const visiting = new Set<NodeId>()

  while (true) {
    const composites = findCompositeNodes(current, registry)
    if (composites.length === 0) {
      return current
    }

    const instanceId = composites[0]!
    if (visiting.has(instanceId)) {
      throw new Error(`Composite instance cycle detected at "${instanceId}"`)
    }
    visiting.add(instanceId)
    current = expandCompositeInstance(current, instanceId, registry)
  }
}

export function buildExecutionProgram(graph: Graph, registry: Registry): ExecutionProgram {
  const subgraphs = new Map<SubgraphKey, Graph>()

  for (const node of Object.values(graph.nodes)) {
    const def = getNodeDefinition(registry, node.type)
    if (!def || !isGraphBackedDefinition(def)) continue

    const key = subgraphKey(def.id, node.typeArgs)
    if (subgraphs.has(key)) continue

    const resolved = node.typeArgs?.length
      ? instantiateNodeDefinition(def, node.typeArgs)
      : def
    if (!resolved.body) {
      throw new Error(`Graph-backed definition "${def.id}" is missing body`)
    }
    subgraphs.set(key, resolved.body)
  }

  for (const definition of Object.values(registry.definitions)) {
    if (!isGraphBackedDefinition(definition) || !definition.body) continue
    const defaultKey = subgraphKey(definition.id, undefined)
    if (!subgraphs.has(defaultKey)) {
      subgraphs.set(defaultKey, definition.body)
    }
  }

  return { root: graph, subgraphs }
}

export function isGraphBackedNodeType(typeId: string, registry: Registry): boolean {
  const def = getNodeDefinition(registry, typeId)
  return def !== undefined && isGraphBackedDefinition(def)
}
