/** Node definition libraries. Authoritative spec: imp-spec/docs/packages/imp-core-types/node-libraries.md */

import type { NodeImplementation } from "./implementation"
import type { Graph, NodeId, NodeTypeId, Ports, TypeParam } from "./graph"

/** Maps declared external ports to boundary nodes in a graph-backed body. */
export interface BoundaryBindings {
  inputs: Record<string, NodeId>
  outputs: Record<string, NodeId>
}

/** Catalog entry for a node type — port templates for a `NodeTypeId`. */
export interface NodeDefinition {
  id: NodeTypeId
  name?: string
  typeParams?: TypeParam[]
  /** How hosts lower/execute primitive nodes; omitted on graph-backed entries. */
  implementation?: NodeImplementation
  inputs: Ports
  outputs: Ports
  /** Internal graph for graph-backed definitions. */
  body?: Graph
  /** Required when `body` is present. */
  bindings?: BoundaryBindings
}

/** Named declarative collection of `NodeDefinition`s. */
export interface NodeLibrary {
  id: string
  definitions: NodeDefinition[]
}

/** JSON-serializable catalog of graph-backed definitions. Spec: graph-libraries.md */
export interface GraphLibrary {
  id: string
  definitions: NodeDefinition[]
}

export function isGraphBackedDefinition(def: NodeDefinition): boolean {
  return def.body !== undefined
}

export function isPrimitiveDefinition(def: NodeDefinition): boolean {
  return def.body === undefined
}
