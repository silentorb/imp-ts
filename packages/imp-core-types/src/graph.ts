/** Core Imp graph model. Authoritative spec: imp-spec/docs/packages/imp-core-types/graph-model.md */

import type { SignalType } from "./signal-type"

export type NodeId = string
export type EdgeId = string
export type NodeTypeId = string
export type PortId = string
export type SignalTypeId = string
export type TypeParamId = string
export type GraphTypeId = string

/** Literal value for instance inputs or port defaults. */
export type PrimitiveValue = string | number | boolean | null

/** Opaque type parameter on a polymorphic catalog entry. */
export interface TypeParam {
  id: TypeParamId
}

/**
 * One port template: identity + signal type + optional default.
 * Used on catalog NodeType inputs/outputs — not on graph Node instances.
 * Omit `defaultValue` → required input; set → optional with that fallback.
 */
export interface Port {
  id: PortId
  type: SignalType
  defaultValue?: PrimitiveValue
}

/** Container of port templates — used for NodeType.inputs and NodeType.outputs. */
export type Ports = Record<PortId, Port>

/** Local literal values on a node instance, keyed by input PortId. */
export type InputValues = Partial<Record<PortId, PrimitiveValue>>

export interface PortReference {
  node: NodeId
  port: PortId
}

/** Graph node instance: identity, type ref, and local input literals. */
export interface Node {
  id: NodeId
  type: NodeTypeId
  typeArgs?: SignalType[]
  inputs: InputValues
}

export interface Edge {
  from: PortReference
  to: PortReference
}

export interface Graph {
  nodes: Record<NodeId, Node>
  edges: Record<EdgeId, Edge>
}
