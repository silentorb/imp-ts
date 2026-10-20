/** Relational schema hook for Imp → SQL lowering. Spec: imp-ts/docs/features/sql.md */

import type { PrimitiveValue } from "imp-core-types"
import type { Expression } from "kysely"
import { sql } from "kysely"
import type { DialectSqlOps } from "./dialect"

export interface RelationalEdgesSchema {
  table: string
  sourceColumn: string
  targetColumn: string
  typeColumn: string
  /**
   * JSON/text column of edge properties (simple hosts). Prefer `property` /
   * `propertiesJson` when edge fields are columns + EAV.
   */
  propertiesColumn?: string
  /**
   * Map a logical edge property name to a SQL expression given the edges join
   * alias (e.g. `path_edges`). When absent, the dialect entry's
   * `defaultEdgePropertyExtract` is used with `propertiesColumn`.
   */
  property?(alias: string, name: string): string
  /**
   * SQL expression for an edge property bag given the edges join alias
   * (traverse property-bag merge). When absent, the dialect entry's
   * `defaultEdgePropertiesJson` is used with `propertiesColumn`.
   */
  propertiesJson?(alias: string): string
}

export interface RelationalSchema {
  /** Base relation for SELECT … FROM (host / test placeholder; Tome resolver later). */
  table: string
  /** Map a logical column name to a SQL column identifier or expression. Default: identity. */
  column?(name: string): string
  /**
   * Map an author-facing property literal to the value stored in JSON properties
   * before SQL comparison against a property extract. Default: identity.
   */
  encodePropertyLiteral?(propertyKey: string, authorValue: PrimitiveValue): PrimitiveValue
  /**
   * SQL expression for a node row's JSON property bag, given the table alias used in
   * traverse joins. When absent, the dialect entry's `defaultNodePropertiesJson` is used.
   * Hosts that store node fields as columns can rebuild a bag for edge property merges.
   */
  nodePropertiesJson?(alias: string): string
  /**
   * Extra physical columns from `targets` to keep when overlaying edge property bags
   * (e.g. Tome SQLite `is_archived`). Default: none — host binders pass these explicitly.
   */
  traverseKeepColumns?: readonly string[]
  /**
   * Optional edges relation for path operators (`traverse`).
   * Source collection rows must expose an `id` column joined to `sourceColumn`.
   */
  edges?: RelationalEdgesSchema
  /**
   * Map Imp `traverse` association + direction onto the edges `typeColumn` filter value.
   * Default: use `association` alone (direction ignored).
   */
  edgeType?(association: string, direction: number): string
}

/** Resolve the edges.type filter value for a traverse hop. */
export function resolveEdgeType(
  schema: RelationalSchema,
  association: string,
  direction: number,
): string {
  return schema.edgeType?.(association, direction) ?? association
}

export function resolveColumn(schema: RelationalSchema, name: string): string {
  return schema.column?.(name) ?? name
}

/** JSON bag expression for a node row alias (traverse merge left side). */
export function resolveNodePropertiesJson(
  schema: RelationalSchema,
  alias: string,
  dialect: DialectSqlOps,
): string {
  return schema.nodePropertiesJson?.(alias) ?? dialect.defaultNodePropertiesJson(alias)
}

const IDENT_RE = /^[A-Za-z_][A-Za-z0-9_]*$/

/** Edge property SQL expression for traverse filters (relative to edges join alias). */
export function resolveEdgeProperty(
  edges: RelationalEdgesSchema,
  alias: string,
  name: string,
  dialect: DialectSqlOps,
): string {
  if (!IDENT_RE.test(alias)) {
    throw new Error(`edges join alias must be a simple SQL identifier, got "${alias}"`)
  }
  if (!IDENT_RE.test(name)) {
    throw new Error(`edge property name must be a simple identifier, got "${name}"`)
  }
  if (edges.property) {
    return edges.property(alias, name)
  }
  const propsCol = edges.propertiesColumn
  if (!propsCol) {
    throw new Error(
      "traverse edge property filter requires schema.edges.property or schema.edges.propertiesColumn",
    )
  }
  if (!IDENT_RE.test(propsCol)) {
    throw new Error(
      `edges.propertiesColumn must be a simple SQL identifier, got "${propsCol}"`,
    )
  }
  return dialect.defaultEdgePropertyExtract(alias, propsCol, name)
}

/** Edge property-bag SQL for traverse merge, or null when unavailable. */
export function resolveEdgePropertiesJson(
  edges: RelationalEdgesSchema,
  alias: string,
  dialect: DialectSqlOps,
): string | null {
  if (!IDENT_RE.test(alias)) {
    throw new Error(`edges join alias must be a simple SQL identifier, got "${alias}"`)
  }
  if (edges.propertiesJson) {
    return edges.propertiesJson(alias)
  }
  const propsCol = edges.propertiesColumn
  if (!propsCol) return null
  if (!IDENT_RE.test(propsCol)) {
    throw new Error(
      `edges.propertiesColumn must be a simple SQL identifier, got "${propsCol}"`,
    )
  }
  return dialect.defaultEdgePropertiesJson(alias, propsCol)
}

/** Simple identifiers use sql.id; other strings (e.g. json extracts) are embedded raw. */
export function columnExpression(
  schema: RelationalSchema,
  name: string,
): Expression<unknown> {
  const mapped = resolveColumn(schema, name)
  if (IDENT_RE.test(mapped)) {
    return sql.id(mapped)
  }
  return sql.raw(mapped)
}

/**
 * SELECT-list expression for `project`: non-identifier mappings (and renamed
 * identifiers) are aliased to the logical column name so result keys match.
 */
export function projectedColumnExpression(
  schema: RelationalSchema,
  name: string,
): Expression<unknown> {
  if (!IDENT_RE.test(name)) {
    throw new Error(`project column name must be a simple identifier, got "${name}"`)
  }
  const mapped = resolveColumn(schema, name)
  if (IDENT_RE.test(mapped)) {
    if (mapped === name) {
      return sql.id(mapped)
    }
    return sql`${sql.id(mapped)} as ${sql.id(name)}`
  }
  return sql.raw(`${mapped} as ${name}`)
}
