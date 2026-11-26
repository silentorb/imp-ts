/** Core Imp graph model. Authoritative spec: imp-spec/docs/packages/imp-core-types/graph-model.md */

import type { Type } from "./type"

export type NodeId = string
export type EdgeId = string
export type NodeTypeId = string
export type PortId = string
export type TypeId = string
export type TypeParamId = string

/** Literal value for instance inputs or port defaults. */
export type PrimitiveValue = string | number | boolean | null

/** Opaque type parameter on a polymorphic catalog entry. */
export interface TypeParam {
  id: TypeParamId
  /** A type argument must be assignable to every bound (typically a named union). */
  bounds?: Type[]
}

/**
 * One port template: identity + type + optional default + optional variadic.
 * Used on catalog NodeType inputs/outputs — not on graph Node instances.
 * Omit `defaultValue` → required input; set → optional with that fallback.
 * `variadic: true` → multi-edge fan-in; `type` is the element type.
 */
export interface Port {
  id: PortId
  type: Type
  defaultValue?: PrimitiveValue
  variadic?: boolean
}

/** Container of port templates — used for NodeType.inputs and NodeType.outputs. */
export type Ports = Record<PortId, Port>

/** Local literal values on a node instance, keyed by input PortId. */
export type InputValues = Partial<Record<PortId, PrimitiveValue>>

export interface PortReference {
  node: NodeId
  port: PortId
}

/** Graph node instance: identity, optional title, type ref, and local input literals. */
export interface Node {
  id: NodeId
  /** Optional human-facing label; editors display `title` when present, otherwise `id`. */
  title?: string
  type: NodeTypeId
  typeArgs?: Type[]
  inputs: InputValues
}

export interface Edge {
  from: PortReference
  to: PortReference
  /** Required and unique among edges into the same variadic target. */
  order?: number
}

export interface Graph {
  nodes: Record<NodeId, Node>
  edges: Record<EdgeId, Edge>
}
