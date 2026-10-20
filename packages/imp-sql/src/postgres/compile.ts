/** Postgres-specific Imp → SQL compile entry. Spec: imp-ts/docs/features/sql.md */

import {
  DummyDriver,
  Kysely,
  PostgresAdapter,
  PostgresIntrospector,
  PostgresQueryCompiler,
} from "kysely"
import type { Graph } from "imp-core-types"
import { postgresDialectOps } from "../dialect"
import {
  compileSql,
  lowerGraphToCompiledQuery,
  type CompiledImpQuery,
  type SqlHostCompileOptions,
} from "../compile-core"

type AnyDb = Record<string, Record<string, unknown>>

function createPostgresCompileDb(): Kysely<AnyDb> {
  return new Kysely({
    dialect: {
      createAdapter: () => new PostgresAdapter(),
      createDriver: () => new DummyDriver(),
      createIntrospector: (db) => new PostgresIntrospector(db),
      createQueryCompiler: () => new PostgresQueryCompiler(),
    },
  })
}

export type PostgresCompileOptions = SqlHostCompileOptions

/**
 * Lower an Imp collection-transform graph to a compiled Postgres query
 * (`$n` placeholders, jsonb `->>` / `||` dialect defaults).
 * Translation-only — does not execute against a live database.
 */
export function compilePostgres(
  graph: Graph,
  options: PostgresCompileOptions,
): CompiledImpQuery {
  return lowerGraphToCompiledQuery(graph, {
    ...options,
    dialect: "postgres",
    dialectOps: postgresDialectOps,
    db: createPostgresCompileDb(),
  })
}

export { compileSql }
export type { CompiledImpQuery, SqlHostCompileOptions }
