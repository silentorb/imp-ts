/** Expression (predicate / scalar) lowering. Spec: docs/features/sql.md */

import type { Edge, Graph, NodeId, PortId, PrimitiveValue } from "imp-spec"
import type { Expression, ExpressionBuilder } from "kysely"
import { sql } from "kysely"
import type { Registry } from "imp-registry"
import {
  requireNode,
  requireNodeType,
  resolveInput,
  type EdgeTargetKey,
} from "../resolve.ts"
import { columnExpression, type RelationalSchema } from "../schema.ts"

type Eb = ExpressionBuilder<Record<string, Record<string, unknown>>, string>

export interface LowerContext {
  graph: Graph
  registry: Registry
  schema: RelationalSchema
  edgesByTarget: Map<EdgeTargetKey, Edge>
  visiting: Set<NodeId>
}

function literalExpr(value: PrimitiveValue): Expression<unknown> {
  if (value === null) {
    return sql`null`
  }
  return sql`${value}`
}

function requireString(value: PrimitiveValue, label: string): string {
  if (typeof value !== "string") {
    throw new Error(`${label} must be a string, got ${typeof value}`)
  }
  return value
}

function resolvePortExpr(
  ctx: LowerContext,
  eb: Eb,
  nodeId: NodeId,
  portId: PortId,
): Expression<unknown> {
  const resolved = resolveInput(
    ctx.graph,
    ctx.registry,
    ctx.edgesByTarget,
    nodeId,
    portId,
  )
  if (resolved.kind === "literal") {
    return literalExpr(resolved.value)
  }
  return lowerExprNode(ctx, eb, resolved.from.node, resolved.from.port)
}

/** Lower a node output port to a Kysely expression (predicates / scalars). */
export function lowerExprNode(
  ctx: LowerContext,
  eb: Eb,
  nodeId: NodeId,
  _outputPort: PortId,
): Expression<unknown> {
  if (ctx.visiting.has(nodeId)) {
    throw new Error(`Cycle detected while lowering expression at node "${nodeId}"`)
  }
  ctx.visiting.add(nodeId)
  try {
    const node = requireNode(ctx.graph, nodeId)
    requireNodeType(ctx.registry, node.type)

    switch (node.type) {
      case "literal":
      case "parameter": {
        const resolved = resolveInput(
          ctx.graph,
          ctx.registry,
          ctx.edgesByTarget,
          nodeId,
          "value",
        )
        if (resolved.kind === "wire") {
          return lowerExprNode(ctx, eb, resolved.from.node, resolved.from.port)
        }
        return literalExpr(resolved.value)
      }
      case "column": {
        const nameResolved = resolveInput(
          ctx.graph,
          ctx.registry,
          ctx.edgesByTarget,
          nodeId,
          "name",
        )
        if (nameResolved.kind === "wire") {
          throw new Error(`column.name must be a literal string on node "${nodeId}"`)
        }
        return columnExpression(
          ctx.schema,
          requireString(nameResolved.value, "column.name"),
        )
      }
      case "equals":
        return eb(
          resolvePortExpr(ctx, eb, nodeId, "left"),
          "=",
          resolvePortExpr(ctx, eb, nodeId, "right"),
        )
      case "not_equals":
        return eb(
          resolvePortExpr(ctx, eb, nodeId, "left"),
          "!=",
          resolvePortExpr(ctx, eb, nodeId, "right"),
        )
      case "less_than":
        return eb(
          resolvePortExpr(ctx, eb, nodeId, "left"),
          "<",
          resolvePortExpr(ctx, eb, nodeId, "right"),
        )
      case "greater_than":
        return eb(
          resolvePortExpr(ctx, eb, nodeId, "left"),
          ">",
          resolvePortExpr(ctx, eb, nodeId, "right"),
        )
      case "and":
        return sql`(${resolvePortExpr(ctx, eb, nodeId, "left")} and ${resolvePortExpr(ctx, eb, nodeId, "right")})`
      case "or":
        return sql`(${resolvePortExpr(ctx, eb, nodeId, "left")} or ${resolvePortExpr(ctx, eb, nodeId, "right")})`
      case "not":
        return sql`(not ${resolvePortExpr(ctx, eb, nodeId, "value")})`
      default:
        throw new Error(
          `Node type "${node.type}" on "${nodeId}" cannot be lowered as an expression`,
        )
    }
  } finally {
    ctx.visiting.delete(nodeId)
  }
}
