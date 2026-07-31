/** Relational schema hook for Imp → SQL lowering. Spec: docs/features/sql.md */

import type { Expression } from "kysely"
import { sql } from "kysely"

export interface RelationalEdgesSchema {
  table: string
  sourceColumn: string
  targetColumn: string
  typeColumn: string
}

export interface RelationalSchema {
  /** Base relation for SELECT … FROM (host / test placeholder; Tome resolver later). */
  table: string
  /** Map a logical column name to a SQL column identifier or expression. Default: identity. */
  column?(name: string): string
  /**
   * Optional edges relation for path operators (`traverse`).
   * Source collection rows must expose an `id` column joined to `sourceColumn`.
   */
  edges?: RelationalEdgesSchema
}

export function resolveColumn(schema: RelationalSchema, name: string): string {
  return schema.column?.(name) ?? name
}

/** Simple identifiers use sql.id; other strings (e.g. json_extract) are embedded raw. */
export function columnExpression(
  schema: RelationalSchema,
  name: string,
): Expression<unknown> {
  const mapped = resolveColumn(schema, name)
  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(mapped)) {
    return sql.id(mapped)
  }
  return sql.raw(mapped)
}
