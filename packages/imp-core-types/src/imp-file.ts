/** Imp files: the JSON shape for types, definitions, nodes and edges. Spec: imp-spec/docs/packages/imp-file/imp-files.md */

import type { Edge, EdgeId, Node } from "./graph"
import type { NodeDefinition } from "./library"
import type { TypeDefinition } from "./type-definition"

/** An `Edge` with its identity (file edges are array elements, not map entries). */
export interface ImpFileEdge extends Edge {
  id: EdgeId
}

/** Any mix of type definitions, node definitions, nodes and edges. Every section is optional. */
export interface ImpFile {
  /** Identifies Imp content among other JSON documents. */
  format?: "imp"
  /** Provenance (e.g. a library id); omitted when stored as a record value. */
  id?: string
  types?: TypeDefinition[]
  definitions?: NodeDefinition[]
  nodes?: Node[]
  edges?: ImpFileEdge[]
}

export type ImpFileSection = "types" | "definitions" | "nodes" | "edges"

export const IMP_FILE_SECTIONS: readonly ImpFileSection[] = ["types", "definitions", "nodes", "edges"]
