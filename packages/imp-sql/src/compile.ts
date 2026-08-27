/** Imp graph → Kysely SQL lowering. Spec: docs/features/sql.md */

import type { CompiledQuery } from "kysely"
import {
  DummyDriver,
  Kysely,
  SqliteAdapter,
  SqliteIntrospector,
  SqliteQueryCompiler,
} from "kysely"
import type { Graph, PortReference } from "imp-spec"
import type { Registry } from "imp-registry"
import {
  createCollectionLowerContext,
  lowerCollectionPort,
} from "./lower/collection"
import {
  defaultSink,
  defaultSource,
  indexEdgesByTarget,
  resolveInput,
} from "./resolve"
import type { RelationalSchema } from "./schema"

type AnyDb = Record<string, Record<string, unknown>>

export interface SqlCompileOptions {
  registry: Registry
  schema: RelationalSchema
  /** Default: sole core `input` node's `value` output. */
  source?: PortReference
  /** Default: sole core `output` node's `value` input. */
  sink?: PortReference
  /** Default: `"sqlite"`. */
  dialect?: "sqlite"
}

export interface CompiledImpQuery {
  readonly compiled: CompiledQuery
  readonly dialect: "sqlite"
}

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

/**
 * Lower an Imp collection-transform graph to a compiled Kysely query.
 */
export function graphToKysely(
  graph: Graph,
  options: SqlCompileOptions,
): CompiledImpQuery {
  const dialect = options.dialect ?? "sqlite"
  if (dialect !== "sqlite") {
    throw new Error(`Unsupported dialect "${dialect}"`)
  }

  const source = options.source ?? defaultSource(graph)
  const sink = options.sink ?? defaultSink(graph)
  const edgesByTarget = indexEdgesByTarget(graph)
  const db = createSqliteCompileDb()

  const ctx = createCollectionLowerContext({
    graph,
    registry: options.registry,
    schema: options.schema,
    edgesByTarget,
    db,
    sourceNodeId: source.node,
  })

  // Sink is typically an `output` node's `value` *input* — resolve that input
  // to the upstream collection output, or lower an `output` node directly.
  const sinkNode = graph.nodes[sink.node]
  if (sinkNode == null) {
    throw new Error(`Unknown sink node "${sink.node}"`)
  }

  let query
  if (sinkNode.type === "output" && sink.port === "value") {
    query = lowerCollectionPort(ctx, sink.node, "value")
  } else {
    const resolved = resolveInput(
      graph,
      options.registry,
      edgesByTarget,
      sink.node,
      sink.port,
    )
    if (resolved.kind === "literal") {
      throw new Error(`Sink "${sink.node}.${sink.port}" must be a wired collection`)
    }
    query = lowerCollectionPort(ctx, resolved.from.node, resolved.from.port)
  }

  // Ensure source is reachable / used: base query comes from source input.
  void source

  return {
    compiled: query.compile(),
    dialect: "sqlite",
  }
}

/** Extract SQL string + bound parameters for hosts such as Tome `queryAll`. */
export function compileSql(query: CompiledImpQuery): {
  sql: string
  parameters: readonly unknown[]
} {
  return {
    sql: query.compiled.sql,
    parameters: query.compiled.parameters,
  }
}
