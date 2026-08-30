/** Helpers for encoding author enum labels before SQL property comparisons. */

import type { Graph, NodeId, PortId, PrimitiveValue } from "imp-core-types"
import type { Registry } from "imp-registry"
import {
  requireNode,
  resolveInput,
  type EdgeTargetKey,
} from "../resolve"
import type { RelationalSchema } from "../schema"

/** Map an author literal to stored JSON property form before SQL bind. Default: identity. */
export function encodeStoredPropertyLiteral(
  schema: RelationalSchema,
  propertyKey: string,
  authorValue: PrimitiveValue,
): PrimitiveValue {
  return schema.encodePropertyLiteral?.(propertyKey, authorValue) ?? authorValue
}

function columnNameFromNode(
  graph: Graph,
  registry: Registry,
  edgesByTarget: Map<EdgeTargetKey, import("imp-core-types").Edge>,
  nodeId: NodeId,
  outputPort: PortId,
): string | null {
  const node = requireNode(graph, nodeId)
  if (node.type === "column" && outputPort === "value") {
    const nameResolved = resolveInput(graph, registry, edgesByTarget, nodeId, "name")
    if (nameResolved.kind === "literal" && typeof nameResolved.value === "string") {
      return nameResolved.value
    }
    return null
  }
  if ((node.type === "literal" || node.type === "parameter") && outputPort === "value") {
    const resolved = resolveInput(graph, registry, edgesByTarget, nodeId, "value")
    if (resolved.kind === "wire") {
      return columnNameFromNode(
        graph,
        registry,
        edgesByTarget,
        resolved.from.node,
        resolved.from.port,
      )
    }
  }
  return null
}

function literalValueFromNode(
  graph: Graph,
  registry: Registry,
  edgesByTarget: Map<EdgeTargetKey, import("imp-core-types").Edge>,
  nodeId: NodeId,
  outputPort: PortId,
): PrimitiveValue | null {
  const node = requireNode(graph, nodeId)
  if ((node.type === "literal" || node.type === "parameter") && outputPort === "value") {
    const resolved = resolveInput(graph, registry, edgesByTarget, nodeId, "value")
    if (resolved.kind === "literal") {
      return resolved.value
    }
    if (resolved.kind === "wire") {
      return literalValueFromNode(
        graph,
        registry,
        edgesByTarget,
        resolved.from.node,
        resolved.from.port,
      )
    }
  }
  return null
}

export function columnNameFromComparisonPort(
  graph: Graph,
  registry: Registry,
  edgesByTarget: Map<EdgeTargetKey, import("imp-core-types").Edge>,
  nodeId: NodeId,
  portId: PortId,
): string | null {
  const resolved = resolveInput(graph, registry, edgesByTarget, nodeId, portId)
  if (resolved.kind === "literal") {
    return null
  }
  return columnNameFromNode(
    graph,
    registry,
    edgesByTarget,
    resolved.from.node,
    resolved.from.port,
  )
}

export function literalValueFromComparisonPort(
  graph: Graph,
  registry: Registry,
  edgesByTarget: Map<EdgeTargetKey, import("imp-core-types").Edge>,
  nodeId: NodeId,
  portId: PortId,
): PrimitiveValue | null {
  const resolved = resolveInput(graph, registry, edgesByTarget, nodeId, portId)
  if (resolved.kind === "literal") {
    return resolved.value
  }
  return literalValueFromNode(
    graph,
    registry,
    edgesByTarget,
    resolved.from.node,
    resolved.from.port,
  )
}
