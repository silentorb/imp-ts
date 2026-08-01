/** Collection pipeline lowering. Spec: docs/features/sql.md */

import type { Edge, Graph, NodeId, PortId } from "imp-spec"
import type { Kysely, SelectQueryBuilder } from "kysely"
import { sql } from "kysely"
import type { Registry } from "imp-registry"
import {
  requireNode,
  requireNodeType,
  resolveInput,
  type EdgeTargetKey,
} from "../resolve.ts"
import { columnExpression, type RelationalSchema } from "../schema.ts"
import { lowerExprNode, type LowerContext } from "./expressions.ts"

type AnyDb = Record<string, Record<string, unknown>>
export type AnySelect = SelectQueryBuilder<AnyDb, string, object>

export interface CollectionLowerContext extends LowerContext {
  db: Kysely<AnyDb>
  sourceNodeId: NodeId
}

function requireNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number`)
  }
  return value
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== "string") {
    throw new Error(`${label} must be a string`)
  }
  return value
}

function resolveLiteralOrThrow(
  ctx: CollectionLowerContext,
  nodeId: NodeId,
  portId: PortId,
  label: string,
): unknown {
  const resolved = resolveInput(
    ctx.graph,
    ctx.registry,
    ctx.edgesByTarget,
    nodeId,
    portId,
  )
  if (resolved.kind === "wire") {
    if (requireNode(ctx.graph, resolved.from.node).type === "literal") {
      const lit = resolveInput(
        ctx.graph,
        ctx.registry,
        ctx.edgesByTarget,
        resolved.from.node,
        "value",
      )
      if (lit.kind === "literal") {
        return lit.value
      }
    }
    throw new Error(`${label} on "${nodeId}" must resolve to a literal`)
  }
  return resolved.value
}

function followCollectionPort(
  ctx: CollectionLowerContext,
  nodeId: NodeId,
  portId: PortId,
  label: string,
): AnySelect {
  const resolved = resolveInput(
    ctx.graph,
    ctx.registry,
    ctx.edgesByTarget,
    nodeId,
    portId,
  )
  if (resolved.kind === "literal") {
    throw new Error(`${label} on "${nodeId}" must be wired, not a literal`)
  }
  return lowerCollectionPort(ctx, resolved.from.node, resolved.from.port)
}

function followCollectionInput(
  ctx: CollectionLowerContext,
  nodeId: NodeId,
): AnySelect {
  return followCollectionPort(ctx, nodeId, "collection", "collection input")
}

/** Lower a collection-producing output port to a select query builder. */
export function lowerCollectionPort(
  ctx: CollectionLowerContext,
  nodeId: NodeId,
  outputPort: PortId,
): AnySelect {
  if (ctx.visiting.has(nodeId)) {
    throw new Error(`Cycle detected while lowering collection at node "${nodeId}"`)
  }
  ctx.visiting.add(nodeId)
  try {
    const node = requireNode(ctx.graph, nodeId)
    requireNodeType(ctx.registry, node.type)

    switch (node.type) {
      case "input": {
        if (nodeId !== ctx.sourceNodeId) {
          throw new Error(
            `Unexpected input node "${nodeId}"; only the configured source input is supported`,
          )
        }
        if (outputPort !== "value") {
          throw new Error(`input node "${nodeId}" only has output port "value"`)
        }
        return ctx.db.selectFrom(ctx.schema.table).selectAll()
      }
      case "filter": {
        const base = followCollectionInput(ctx, nodeId)
        const pred = resolveInput(
          ctx.graph,
          ctx.registry,
          ctx.edgesByTarget,
          nodeId,
          "predicate",
        )
        if (pred.kind === "literal") {
          throw new Error(`filter.predicate on "${nodeId}" must be wired to an expression`)
        }
        return base.where((eb) =>
          lowerExprNode(ctx, eb as never, pred.from.node, pred.from.port) as never,
        )
      }
      case "except": {
        // Compose keep/exclude as SQL selects; anti-membership via NOT EXISTS (no in-memory subtract).
        const keep = followCollectionPort(
          ctx,
          nodeId,
          "collection",
          "except.collection",
        )
        const exclude = followCollectionPort(
          ctx,
          nodeId,
          "exclude",
          "except.exclude",
        )
        return ctx.db
          .selectFrom(keep.as("keep"))
          .selectAll("keep")
          .where((eb) =>
            eb.not(
              eb.exists(
                eb
                  .selectFrom(exclude.as("excl"))
                  .select(sql.lit(1).as("one"))
                  .whereRef("excl.id", "=", "keep.id"),
              ),
            ),
          ) as unknown as AnySelect
      }
      case "sort": {
        const base = followCollectionInput(ctx, nodeId)
        const columnName = requireString(
          resolveLiteralOrThrow(ctx, nodeId, "column", "sort.column"),
          "sort.column",
        )
        const directionRaw = requireString(
          resolveLiteralOrThrow(ctx, nodeId, "direction", "sort.direction"),
          "sort.direction",
        ).toLowerCase()
        if (directionRaw !== "asc" && directionRaw !== "desc") {
          throw new Error(`sort.direction must be "asc" or "desc", got "${directionRaw}"`)
        }
        const col = columnExpression(ctx.schema, columnName)
        return base.orderBy(col, directionRaw)
      }
      case "limit": {
        const base = followCollectionInput(ctx, nodeId)
        const count = requireNumber(
          resolveLiteralOrThrow(ctx, nodeId, "count", "limit.count"),
          "limit.count",
        )
        return base.limit(count)
      }
      case "offset": {
        const base = followCollectionInput(ctx, nodeId)
        const count = requireNumber(
          resolveLiteralOrThrow(ctx, nodeId, "count", "offset.count"),
          "offset.count",
        )
        return base.offset(count)
      }
      case "project": {
        const base = followCollectionInput(ctx, nodeId)
        const columnsRaw = requireString(
          resolveLiteralOrThrow(ctx, nodeId, "columns", "project.columns"),
          "project.columns",
        )
        const cols = columnsRaw
          .split(",")
          .map((c) => c.trim())
          .filter((c) => c.length > 0)
          .map((c) => columnExpression(ctx.schema, c))
        if (cols.length === 0) {
          throw new Error(`project.columns on "${nodeId}" must list at least one column`)
        }
        return base.clearSelect().select(cols as never)
      }
      case "traverse": {
        const edges = ctx.schema.edges
        if (edges == null) {
          throw new Error(
            `traverse on "${nodeId}" requires schema.edges (host edges relation)`,
          )
        }
        for (const [label, name] of [
          ["edges.table", edges.table],
          ["edges.sourceColumn", edges.sourceColumn],
          ["edges.targetColumn", edges.targetColumn],
          ["edges.typeColumn", edges.typeColumn],
          ["schema.table", ctx.schema.table],
        ] as const) {
          if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
            throw new Error(`${label} must be a simple SQL identifier, got "${name}"`)
          }
        }
        const base = followCollectionInput(ctx, nodeId)
        const edgeType = requireString(
          resolveLiteralOrThrow(ctx, nodeId, "edgeType", "traverse.edgeType"),
          "traverse.edgeType",
        )
        // sources ⋈ edges(type) ⋈ nodes AS targets → distinct target rows
        const joined = ctx.db
          .selectFrom(base.as("sources"))
          .innerJoin(
            `${edges.table} as path_edges`,
            (join) =>
              join
                .on(
                  sql.ref(`path_edges.${edges.sourceColumn}`),
                  "=",
                  sql.ref("sources.id"),
                )
                .on(sql.ref(`path_edges.${edges.typeColumn}`), "=", edgeType),
          )
          .innerJoin(`${ctx.schema.table} as targets`, (join) =>
            join.on(
              sql.ref("targets.id"),
              "=",
              sql.ref(`path_edges.${edges.targetColumn}`),
            ),
          )
          .selectAll("targets")
          .distinct()
        return joined as unknown as AnySelect
      }
      case "output": {
        const resolved = resolveInput(
          ctx.graph,
          ctx.registry,
          ctx.edgesByTarget,
          nodeId,
          "value",
        )
        if (resolved.kind === "literal") {
          throw new Error(`output.value on "${nodeId}" must be wired to a collection`)
        }
        return lowerCollectionPort(ctx, resolved.from.node, resolved.from.port)
      }
      default:
        throw new Error(
          `Node type "${node.type}" on "${nodeId}" cannot be lowered as a collection (output "${outputPort}")`,
        )
    }
  } finally {
    ctx.visiting.delete(nodeId)
  }
}

export function createCollectionLowerContext(args: {
  graph: Graph
  registry: Registry
  schema: RelationalSchema
  edgesByTarget: Map<EdgeTargetKey, Edge>
  db: Kysely<AnyDb>
  sourceNodeId: NodeId
}): CollectionLowerContext {
  return {
    graph: args.graph,
    registry: args.registry,
    schema: args.schema,
    edgesByTarget: args.edgesByTarget,
    visiting: new Set(),
    db: args.db,
    sourceNodeId: args.sourceNodeId,
  }
}
