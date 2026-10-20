/** SQLite-specific Imp → SQL compile entry. Spec: imp-ts/docs/features/sql.md */

import {
  DummyDriver,
  Kysely,
  SqliteAdapter,
  SqliteIntrospector,
  SqliteQueryCompiler,
} from "kysely"
import type { Graph } from "imp-core-types"
import { sqliteDialectOps } from "../dialect"
import {
  compileSql,
  lowerGraphToCompiledQuery,
  type CompiledImpQuery,
  type SqlHostCompileOptions,
} from "../compile-core"

type AnyDb = Record<string, Record<string, unknown>>

function createSqliteCompileDb(): Kysely<AnyDb> {
  return new Kysely({
    dialect: {
      createAdapter: () => new SqliteAdapter(),
      createDriver: () => new DummyDriver(),
      createIntrospector: (db) => new SqliteIntrospector(db),
      createQueryCompiler: () => new SqliteQueryCompiler(),
    },
  })
}

export type SqliteCompileOptions = SqlHostCompileOptions

/**
 * Lower an Imp collection-transform graph to a compiled SQLite query
 * (`?` placeholders, json_extract / json_patch dialect defaults).
 */
export function compileSqlite(
  graph: Graph,
  options: SqliteCompileOptions,
): CompiledImpQuery {
  return lowerGraphToCompiledQuery(graph, {
    ...options,
    dialect: "sqlite",
    dialectOps: sqliteDialectOps,
    db: createSqliteCompileDb(),
  })
}

export { compileSql }
export type { CompiledImpQuery, SqlHostCompileOptions }
