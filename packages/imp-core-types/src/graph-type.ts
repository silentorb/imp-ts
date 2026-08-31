/** Graph type libraries. Authoritative spec: imp-spec/docs/packages/imp-core-types/graph-types.md */

import type { GraphTypeId, Ports, TypeParam } from "./graph"

/** Catalog entry for a reusable subgraph interface. */
export interface GraphType {
  id: GraphTypeId
  typeParams?: TypeParam[]
  inputs: Ports
  outputs: Ports
}

/** Named declarative collection of `GraphType`s. */
export interface GraphTypeLibrary {
  id: string
  types: Record<GraphTypeId, GraphType>
}
