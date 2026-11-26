/** Imp file serialization, graph sources and section checks. Spec: imp-spec/docs/packages/imp-file/imp-files.md */

import type { Edge, Graph, GraphSource, ImpFile, ImpFileSection, Node } from "imp-core-types"
import { IMP_FILE_SECTIONS, edgeMapProvider, nodeMapProvider } from "imp-core-types"

/** JSON text with sections in canonical order; empty sections omitted; element order preserved. */
export function serializeImpFile(file: ImpFile, space?: number): string {
  const ordered: Record<string, unknown> = {}
  if (file.format) ordered.format = file.format
  if (file.id) ordered.id = file.id
  for (const name of IMP_FILE_SECTIONS) {
    const elements = file[name]
    if (elements?.length) ordered[name] = elements
  }
  return JSON.stringify(ordered, null, space)
}

/** The file's nodes and edges as id-keyed maps (element order kept as key order). */
export function impFileGraph(file: ImpFile): Graph {
  const nodes: Record<string, Node> = {}
  for (const node of file.nodes ?? []) nodes[node.id] = node
  const edges: Record<string, Edge> = {}
  for (const { id, ...edge } of file.edges ?? []) edges[id] = edge
  return { nodes, edges }
}

/** Graph source over the file's `nodes` / `edges`, in element order. */
export function impFileGraphSource(file: ImpFile): GraphSource {
  const graph = impFileGraph(file)
  return { nodes: nodeMapProvider(graph.nodes), edges: edgeMapProvider(graph.edges) }
}

/** An Imp file holding a graph's nodes and edges (edge ids from the graph's edge keys). */
export function impFileFromGraph(
  graph: Graph,
  extras: Omit<ImpFile, "nodes" | "edges"> = {},
): ImpFile {
  return {
    ...extras,
    nodes: Object.values(graph.nodes),
    edges: Object.entries(graph.edges).map(([id, edge]) => ({ id, ...edge })),
  }
}

/** Throws when a section outside `allowed` is non-empty (e.g. topology-only record slots). */
export function assertImpFileSections(file: ImpFile, allowed: readonly ImpFileSection[]): void {
  for (const name of IMP_FILE_SECTIONS) {
    if (!allowed.includes(name) && file[name]?.length) {
      throw new Error(
        `Imp file section "${name}" is not allowed here (allowed: ${allowed.join(", ") || "none"})`,
      )
    }
  }
}
