/** Dialect SQL ops — built by dialect compile entries, consumed by shared helpers. */

/** Supported Imp → SQL compile dialects. */
export type SqlDialect = "sqlite" | "postgres"

/**
 * Dialect-specific SQL fragments. Dialect compile entries construct these and
 * pass them into shared lowering helpers (specific → general).
 */
export interface DialectSqlOps {
  /**
   * Default edge property extract when `schema.edges.property` is absent but
   * `propertiesColumn` is set.
   */
  defaultEdgePropertyExtract(
    alias: string,
    propertiesColumn: string,
    name: string,
  ): string
  /** Overlay edge property bag onto a node property bag (traverse merge). */
  mergePropertyBags(nodeBagExpr: string, edgeBagExpr: string): string
  /** Default node JSON bag when `schema.nodePropertiesJson` is absent. */
  defaultNodePropertiesJson(alias: string): string
  /**
   * Default edge JSON bag when `propertiesJson` is absent but
   * `propertiesColumn` is set.
   */
  defaultEdgePropertiesJson(alias: string, propertiesColumn: string): string
}

/** SQLite JSON / merge idioms (json_extract, json_patch). */
export const sqliteDialectOps: DialectSqlOps = {
  defaultEdgePropertyExtract(alias, propertiesColumn, name) {
    return `json_extract(${alias}.${propertiesColumn}, '$.${name}')`
  },
  mergePropertyBags(nodeBagExpr, edgeBagExpr) {
    return `json_patch(coalesce(${nodeBagExpr}, '{}'), coalesce(${edgeBagExpr}, '{}'))`
  },
  defaultNodePropertiesJson(alias) {
    return `${alias}.properties`
  },
  defaultEdgePropertiesJson(alias, propertiesColumn) {
    return `${alias}.${propertiesColumn}`
  },
}

/**
 * Postgres jsonb idioms (`->>`, `||` merge).
 * Precision target: documented Postgres jsonb behavior (translation tests only).
 */
export const postgresDialectOps: DialectSqlOps = {
  defaultEdgePropertyExtract(alias, propertiesColumn, name) {
    return `(${alias}.${propertiesColumn}->>'${name}')`
  },
  mergePropertyBags(nodeBagExpr, edgeBagExpr) {
    return `(coalesce(${nodeBagExpr}, '{}'::jsonb) || coalesce(${edgeBagExpr}, '{}'::jsonb))`
  },
  defaultNodePropertiesJson(alias) {
    return `${alias}.properties`
  },
  defaultEdgePropertiesJson(alias, propertiesColumn) {
    return `${alias}.${propertiesColumn}`
  },
}
