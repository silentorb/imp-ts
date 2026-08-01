# SQL lowering

## Summary

**`imp-sql`** lowers Imp graphs that use core boundary nodes, `imp-collection-transforms`, and `imp-pathing` into SQL via [Kysely](https://kysely.dev/). Primary API returns a compiled Kysely query; a helper exposes SQL string + bindings for hosts such as Tome’s `queryAll`.

## When to read this

- Implementing or changing Imp → SQL lowering
- Wiring collection-transform graphs to a relational backend
- Designing a future Tome schema resolver

## Requirements

### API

| Operation | Behavior |
| --- | --- |
| `graphToKysely(graph, options)` | Walk the DAG from boundary source → sink; lower supported node types into a Kysely select query; return `CompiledImpQuery` |
| `compileSql(query)` | Return `{ sql: string; parameters: readonly unknown[] }` from a `CompiledImpQuery` |

### SqlCompileOptions

| Field | Required | Behavior |
| --- | --- | --- |
| `registry` | must | Must include `imp.core` and `imp.collection.transforms` (and `imp.pathing` when using path ops) |
| `schema` | must | `RelationalSchema` — at least a base `table` name; optional `column(name)` mapper; optional `edges` for path ops |
| `source` | may | `{ node, port }` — default: the sole core `input` node’s `value` output |
| `sink` | may | `{ node, port }` — default: the sole core `output` node’s `value` input |
| `dialect` | may | `"sqlite"` (default). Other dialects may be added later |

### RelationalSchema

```ts
interface RelationalEdgesSchema {
  table: string
  sourceColumn: string
  targetColumn: string
  typeColumn: string
}

interface RelationalSchema {
  table: string
  column?(name: string): string
  edges?: RelationalEdgesSchema
  /** Map traverse association + direction → edges.typeColumn filter value. Default: association alone. */
  edgeType?(association: string, direction: number): string
}
```

v1 has **no** Imp `from` node. The host collection is the graph boundary `input`; SQL still needs a `FROM` target, provided by `schema.table`. Path operators require `schema.edges`; source collection rows must expose an `id` column joined to `edges.sourceColumn`.

### Input resolution

For each input port, resolve in order (see [graph-model.md](./graph-model.md)):

1. Incoming edge (wired value)
2. Local `Node.inputs` literal
3. Catalog `Port.defaultValue`
4. Error if required and unsatisfied

### Lowering rules (v1)

| NodeType | SQL effect |
| --- | --- |
| `input` | Base `SELECT … FROM schema.table` (passthrough entry) |
| `output` | Passthrough of its `value` input (sink) |
| `filter` | `WHERE` predicate |
| `except` | Keep rows from `collection` whose `id` is absent from `exclude`: compose both branches as SQL selects and apply anti-membership (`NOT EXISTS` correlating on `id`, or equivalent). Must **not** materialize `exclude` into an in-memory set |
| `sort` | `ORDER BY column ASC\|DESC` |
| `limit` | `LIMIT count` |
| `offset` | `OFFSET count` |
| `project` | `SELECT` listed columns (comma-separated `columns` string); otherwise `SELECT *`. When `schema.column` maps a logical name to a non-identifier expression (or a different identifier), the SELECT item is aliased to the logical name so result keys match (`json_extract(…) AS title`) |
| `traverse` | Join source collection through `schema.edges` filtered by `schema.edgeType(association, direction)` (default: `association`); `direction` must be `0` or `1`; select distinct target rows from `schema.table` |
| `column` | Column reference via `schema.column` or identity |
| `literal` | Bound parameter / literal |
| `equals` / `not_equals` / `less_than` / `greater_than` | Comparison |
| `and` / `or` / `not` | Boolean combinators |

Unsupported or unknown `Node.type` values **must throw**. `traverse` **must throw** when `schema.edges` is absent. Both `collection` and `exclude` on `except` **must** be wired collection ports.

### Errors

Must throw on:

- Unknown node types
- Unsatisfied required inputs
- Missing / ambiguous default `input` or `output` boundary when `source` / `sink` omitted
- Cycles in the dependency walk

### Host schema binding

Hosts (e.g. Tome’s `tome-imp-sql`) supply `RelationalSchema` that maps:

- Node collections → `schema.table` (e.g. `nodes`)
- Edge hops → `schema.edges` (e.g. `relationship_projections`)
- Traverse association/direction → edges `type` filter via `edgeType` (Tome encodes directed projections here; Imp graphs keep the parts separate)
- Property columns → `json_extract(properties, '$.…')` via `column`

Compiled SQL + bindings can feed `TomeQueryCache.queryAll`. No Tome code in this package.

## Design rationale

- Kysely keeps dialect-aware builders without tying Imp to Bun SQLite APIs.
- Boundary `input`/`output` match the collection → collection host shape (Tome) without a table node in the graph.
- `compileSql` is the bridge for executors that only accept string SQL + params.

## Behavior / pipeline

1. Load registry with `coreNodeLibrary` + `collectionTransformsLibrary` (+ `pathingLibrary` when needed).
2. Build an Imp graph: `input` → transforms / `traverse` → `output`.
3. `graphToKysely(graph, { registry, schema: { table: "items", edges?: … } })`.
4. `compileSql(query)` → run against a DB.

## Inputs / outputs / artifacts

| Artifact | Role |
| --- | --- |
| This doc | Lowering contract |
| `packages/imp-sql` | Implementation + tests |
| [collection-transforms.md](./collection-transforms.md) | Collection node catalog |
| [pathing.md](./pathing.md) | Path node catalog |

## Quick start

```ts
import { coreNodeLibrary } from "imp-spec"
import { collectionTransformsLibrary } from "imp-collection-transforms"
import { pathingLibrary } from "imp-pathing"
import { createRegistry, loadLibrary } from "imp-registry"
import { graphToKysely, compileSql } from "imp-sql"

const registry = loadLibrary(
  loadLibrary(
    loadLibrary(createRegistry(), coreNodeLibrary),
    collectionTransformsLibrary,
  ),
  pathingLibrary,
)

const compiled = graphToKysely(graph, {
  registry,
  schema: { table: "items" },
})
const { sql, parameters } = compileSql(compiled)
```

## Configuration

None beyond `SqlCompileOptions`.

## Verification

- `bun run typecheck` and `bun test` from the repo root (or this package) must succeed.
- Tests cover `input` → `filter` → `sort` → `limit` → `output` producing SQLite SQL with bound parameters.

## Implementation pointers

- Package: [`packages/imp-sql`](../../packages/imp-sql/)
- Graph model: [graph-model.md](./graph-model.md)
- Combinators: [collection-transforms.md](./collection-transforms.md)
- Pathing: [pathing.md](./pathing.md)

## See also

- [collection-transforms.md](./collection-transforms.md)
- [pathing.md](./pathing.md)
- [graph-model.md](./graph-model.md)
- Root [AGENTS.md](../../AGENTS.md)
