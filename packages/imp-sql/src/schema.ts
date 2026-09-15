/** Relational schema hook for Imp → SQL lowering. Spec: imp-ts/docs/features/sql.md */

import type { PrimitiveValue } from "imp-core-types"
import type { Expression } from "kysely"
import { sql } from "kysely"

export interface RelationalEdgesSchema {
  table: string
  sourceColumn: string
  targetColumn: string
  typeColumn: string
  /** JSON/text column of edge properties for optional traverse edge filters. */
  propertiesColumn?: string
}

export interface RelationalSchema {
  /** Base relation for SELECT … FROM (host / test placeholder; Tome resolver later). */
  table: string
  /** Map a logical column name to a SQL column identifier or expression. Default: identity. */
  column?(name: string): string
  /**
   * Map an author-facing property literal to the value stored in JSON properties
   * before SQL comparison against json_extract (or equivalent). Default: identity.
   */
  encodePropertyLiteral?(propertyKey: string, authorValue: PrimitiveValue): PrimitiveValue
  /**
   * SQL expression for a node row's JSON property bag, given the table alias used in
   * traverse joins (default: `{alias}.properties`). Hosts that store node fields as
   * columns can rebuild a bag (e.g. `json_object(...)`) for edge `json_patch` merges.
   */
  nodePropertiesJson?(alias: string): string
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

/** JSON bag expression for a node row alias (traverse `json_patch` left side). */
export function resolveNodePropertiesJson(
  schema: RelationalSchema,
  alias: string,
): string {
  return schema.nodePropertiesJson?.(alias) ?? `${alias}.properties`
}

const IDENT_RE = /^[A-Za-z_][A-Za-z0-9_]*$/

/** Simple identifiers use sql.id; other strings (e.g. json_extract) are embedded raw. */
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
