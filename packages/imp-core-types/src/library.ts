/** Node type libraries. Authoritative spec: imp-spec/docs/packages/imp-core-types/node-libraries.md */

import type { NodeImplementation } from "./implementation"
import type { NodeTypeId, Ports, TypeParam } from "./graph"

/** Catalog entry for a node type — port templates for a `NodeTypeId`. */
export interface NodeType {
  id: NodeTypeId
  typeParams?: TypeParam[]
  /** How hosts lower/execute this node; omitted → universal using `id`. */
  implementation?: NodeImplementation
  inputs: Ports
  outputs: Ports
}

/** Named declarative collection of `NodeType`s. */
export interface NodeLibrary {
  id: string
  types: Record<NodeTypeId, NodeType>
}
