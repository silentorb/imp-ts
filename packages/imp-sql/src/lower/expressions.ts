/** Expression (predicate / scalar) lowering. Spec: imp-ts/docs/features/sql.md */

import type { Edge, Graph, NodeId, PortId, PrimitiveValue } from "imp-core-types"
import type { Expression, ExpressionBuilder } from "kysely"
import { sql } from "kysely"
import type { Registry } from "imp-registry"
import {
  requireNode,
  requireNodeType,
  resolveInput,
  resolveVariadicInputs,
  type EdgeTargetKey,
} from "../resolve"
import type { DialectSqlOps } from "../dialect"
import { columnExpression, type RelationalSchema } from "../schema"
import {
  columnNameFromComparisonPort,
  encodeStoredPropertyLiteral,
  literalValueFromComparisonPort,
} from "./encode-property-literal"

type Eb = ExpressionBuilder<Record<string, Record<string, unknown>>, string>

export interface LowerContext {
  graph: Graph
  registry: Registry
  schema: RelationalSchema
  dialect: DialectSqlOps
  edgesByTarget: Map<EdgeTargetKey, Edge[]>
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

function resolvePortExprFromWire(
  ctx: LowerContext,
  eb: Eb,
  wire: { kind: "wire"; from: { node: NodeId; port: PortId } },
): Expression<unknown> {
  return lowerExprNode(ctx, eb, wire.from.node, wire.from.port)
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

function comparisonOperands(
  ctx: LowerContext,
  eb: Eb,
  nodeId: NodeId,
): { left: Expression<unknown>; right: Expression<unknown> } {
  const leftColumn = columnNameFromComparisonPort(
    ctx.graph,
    ctx.registry,
    ctx.edgesByTarget,
    nodeId,
    "left",
  )
  const rightColumn = columnNameFromComparisonPort(
    ctx.graph,
    ctx.registry,
    ctx.edgesByTarget,
    nodeId,
    "right",
  )
  const leftLiteral = literalValueFromComparisonPort(
    ctx.graph,
    ctx.registry,
    ctx.edgesByTarget,
    nodeId,
    "left",
  )
  const rightLiteral = literalValueFromComparisonPort(
    ctx.graph,
    ctx.registry,
    ctx.edgesByTarget,
    nodeId,
    "right",
  )

  if (leftColumn !== null && rightLiteral !== null) {
    return {
      left: resolvePortExpr(ctx, eb, nodeId, "left"),
      right: literalExpr(
        encodeStoredPropertyLiteral(ctx.schema, leftColumn, rightLiteral),
      ),
    }
  }
  if (rightColumn !== null && leftLiteral !== null) {
    return {
      left: literalExpr(
        encodeStoredPropertyLiteral(ctx.schema, rightColumn, leftLiteral),
      ),
      right: resolvePortExpr(ctx, eb, nodeId, "right"),
    }
  }
  return {
    left: resolvePortExpr(ctx, eb, nodeId, "left"),
    right: resolvePortExpr(ctx, eb, nodeId, "right"),
  }
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
      case "contains": {
        const haystack = resolvePortExpr(ctx, eb, nodeId, "haystack")
        const needleResolved = resolveInput(
          ctx.graph,
          ctx.registry,
          ctx.edgesByTarget,
          nodeId,
          "needle",
        )
        const needle =
          needleResolved.kind === "literal"
            ? needleResolved.value
            : lowerExprNode(ctx, eb, needleResolved.from.node, needleResolved.from.port)
        return sql`(${haystack} like '%' || ${needle} || '%' escape '\\')`
      }
      case "equals": {
        const { left, right } = comparisonOperands(ctx, eb, nodeId)
        return eb(left, "=", right)
      }
      case "not_equals": {
        const { left, right } = comparisonOperands(ctx, eb, nodeId)
        return eb(left, "!=", right)
      }
      case "less_than": {
        const { left, right } = comparisonOperands(ctx, eb, nodeId)
        return eb(left, "<", right)
      }
      case "greater_than": {
        const { left, right } = comparisonOperands(ctx, eb, nodeId)
        return eb(left, ">", right)
      }
      case "and": {
        const wires = resolveVariadicInputs(ctx.edgesByTarget, nodeId, "operands")
        if (wires.length === 0) {
          throw new Error(`and on "${nodeId}" requires at least one operand`)
        }
        let expr = resolvePortExprFromWire(ctx, eb, wires[0]!)
        for (let i = 1; i < wires.length; i++) {
          expr = sql`(${expr} and ${resolvePortExprFromWire(ctx, eb, wires[i]!)})`
        }
        return expr
      }
      case "or": {
        const wires = resolveVariadicInputs(ctx.edgesByTarget, nodeId, "operands")
        if (wires.length === 0) {
          throw new Error(`or on "${nodeId}" requires at least one operand`)
        }
        let expr = resolvePortExprFromWire(ctx, eb, wires[0]!)
        for (let i = 1; i < wires.length; i++) {
          expr = sql`(${expr} or ${resolvePortExprFromWire(ctx, eb, wires[i]!)})`
        }
        return expr
      }
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
