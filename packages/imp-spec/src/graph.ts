/** Core Imp graph model. Authoritative spec: docs/features/graph-model.md */

export type NodeId = string
export type EdgeId = string
export type NodeTypeId = string
export type PortId = string

/** Port input payload. Stub — fields TBD. */
export interface Input {}

/** Port output payload. Stub — fields TBD. */
export interface Output {}

export interface PortReference {
  node: NodeId
  port: PortId
}

export interface Node {
  id: NodeId
  type: NodeTypeId
  inputs: Record<PortId, Input>
  outputs: Record<PortId, Output>
}

export interface Edge {
  from: PortReference
  to: PortReference
}

export interface Graph {
  nodes: Record<NodeId, Node>
  edges: Record<EdgeId, Edge>
}
