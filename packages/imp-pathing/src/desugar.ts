/**
 * Desugar resolved (tagged) path steps into traverse / project Imp fragments.
 * Spec: imp-spec/docs/packages/imp-pathing/semantic-paths.md
 */

import type { Edge, Graph, Node, PortReference } from "imp-core-types"
import type { EdgePathStep, FieldPathStep, ResolvedPathStep } from "./resolve"

export type DesugarPathOptions = {
  /** Prefix for generated node / edge ids */
  prefix: string
  /** Collection source (typically core `input` value port) */
  source: PortReference
  /**
   * When true and the path ends on a node endpoint (no trailing fields),
   * project `id` (identity default — authors need not write `.id`).
   */
  asScalar?: boolean
}

export type DesugarPathResult = {
  nodes: Record<string, Node>
  edges: Record<string, Edge>
  /** Port holding the resulting collection */
  collection: PortReference
}

function isEdgeStep(step: ResolvedPathStep): step is EdgePathStep {
  return step.kind === "edge"
}

function isFieldStep(step: ResolvedPathStep): step is FieldPathStep {
  return step.kind === "field"
}

/**
 * Expand resolved path steps into `traverse` (+ optional trailing `project`) nodes.
 *
 * Rules (v1, no context-descent):
 * - Zero or more leading `edge` steps → chained `traverse`
 * - Zero or more trailing `field` steps → single `project` with comma-separated names
 * - `field` before / between `edge` steps → throw
 * - `asScalar` + node endpoint → append field `id`
 */
export function desugarPath(
  steps: readonly ResolvedPathStep[],
  options: DesugarPathOptions,
): DesugarPathResult {
  const { prefix, source, asScalar = false } = options
  const nodes: Record<string, Node> = {}
  const edges: Record<string, Edge> = {}

  let phase: "edges" | "fields" = "edges"
  const edgeSteps: EdgePathStep[] = []
  const fieldSteps: FieldPathStep[] = []

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]!
    if (phase === "edges") {
      if (isEdgeStep(step)) {
        edgeSteps.push(step)
      } else if (isFieldStep(step)) {
        phase = "fields"
        fieldSteps.push(step)
      }
    } else if (isFieldStep(step)) {
      fieldSteps.push(step)
    } else {
      throw new Error(
        `desugarPath: edge step after field at index ${i} (no context-descent)`,
      )
    }
  }

  if (asScalar && fieldSteps.length === 0) {
    fieldSteps.push({ kind: "field", name: "id" })
  }

  let collection: PortReference = source
  edgeSteps.forEach((step, i) => {
    const id = `${prefix}_traverse_${i}`
    const inputs: Node["inputs"] = {
      association: step.association,
      direction: step.direction,
    }
    if (step.edge_property !== undefined) {
      inputs.edge_property = step.edge_property
    }
    if (step.edge_equals !== undefined) {
      inputs.edge_equals = step.edge_equals as Node["inputs"][string]
    }
    nodes[id] = { id, type: "traverse", inputs }
    edges[`${prefix}_e_traverse_${i}`] = {
      from: collection,
      to: { node: id, port: "collection" },
    }
    collection = { node: id, port: "collection" }
  })

  if (fieldSteps.length > 0) {
    const id = `${prefix}_project`
    nodes[id] = {
      id,
      type: "project",
      inputs: { columns: fieldSteps.map((f) => f.name).join(",") },
    }
    edges[`${prefix}_e_project`] = {
      from: collection,
      to: { node: id, port: "collection" },
    }
    collection = { node: id, port: "collection" }
  }

  return { nodes, edges, collection }
}

/** Merge desugar fragments into an existing graph (shallow copy). */
export function mergeDesugarIntoGraph(
  graph: Graph,
  fragment: DesugarPathResult,
): Graph {
  return {
    nodes: { ...graph.nodes, ...fragment.nodes },
    edges: { ...graph.edges, ...fragment.edges },
  }
}
