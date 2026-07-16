/** Core Imp graph model. Authoritative spec: docs/features/graph-model.md */

export type NodeId = string
export type EdgeId = string
export type NodeTypeId = string
export type PortId = string
export type SignalTypeId = string

/** Imp signal type. Minimal — identity only; fields may grow later. */
export interface SignalType {
  id: SignalTypeId
}

/** One port: identity + signal type (parameter or return slot). */
export interface Port {
  id: PortId
  type: SignalType
}

/** Container of ports — used for both Node.inputs and Node.outputs. */
export type Ports = Record<PortId, Port>

export interface PortReference {
  node: NodeId
  port: PortId
}

export interface Node {
  id: NodeId
  type: NodeTypeId
  inputs: Ports
  outputs: Ports
}

export interface Edge {
  from: PortReference
  to: PortReference
}

export interface Graph {
  nodes: Record<NodeId, Node>
  edges: Record<EdgeId, Edge>
}
