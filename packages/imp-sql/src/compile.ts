/** Package compile surface. Prefer dialect entries; shared helpers live in compile-core. */

export type {
  CompiledImpQuery,
  SqlHostCompileOptions,
} from "./compile-core"
export { compileSql } from "./compile-core"

export type { SqliteCompileOptions } from "./sqlite/compile"
export { compileSqlite } from "./sqlite/compile"

export type { PostgresCompileOptions } from "./postgres/compile"
export { compilePostgres } from "./postgres/compile"

/** @deprecated Use `SqlHostCompileOptions` — dialect is chosen by compile entry. */
export type { SqlHostCompileOptions as SqlCompileOptions } from "./compile-core"

/**
 * @deprecated Use `compileSqlite`. Kept as an alias for in-flight callers.
 */
export { compileSqlite as graphToKysely } from "./sqlite/compile"
