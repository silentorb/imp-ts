# SQL translation

## Summary

**`imp-sql`** is an **Imp Translator** — it translates Imp graphs that use core boundary nodes, `imp-collection-transforms`, and `imp-pathing` into SQL. **Dialect-specific compile entries** (`compileSqlite`, `compilePostgres`) own dialect idioms and call **shared lowering helpers** (specific → general). A helper exposes SQL string + bindings for hosts that execute raw SQL.

Postgres coverage in this package is **compile / translation** (assert on SQL + bindings). Execute-against-DB suites belong to host stores when they are hooked up.

## When to read this

- Implementing or changing Imp → SQL translation
- Wiring collection-transform graphs to a relational backend
- Designing host `RelationalSchema` bindings
- Adding or changing a SQL dialect entry

## Requirements

### API

| Operation | Behavior |
| --- | --- |
| `compileSqlite(graph, options)` | SQLite compile entry: `?` placeholders; default JSON idioms `json_extract` / `json_patch`; calls shared lowerers |
| `compilePostgres(graph, options)` | Postgres compile entry: `$n` placeholders; default jsonb idioms `->>` / `\|\|` merge; calls shared lowerers |
| `compileSql(query)` | Return `{ sql: string; parameters: readonly unknown[] }` from a compiled query |

Language implementations may name the shared lower step differently. Call stack is **specific → general**: dialect entries construct dialect ops + a compile-only Kysely DB, then invoke shared helpers. Shared helpers must not bake SQLite (or any dialect) defaults.

Deprecated alias: `graphToKysely` → `compileSqlite` (prefer the named entry).

### SqlHostCompileOptions (host options; no dialect field)

| Field | Required | Behavior |
| --- | --- | --- |
| `registry` | must | Must include `imp.core` and `imp.collection.transforms` (and `imp.pathing` when using path ops) |
| `schema` | must | `RelationalSchema` — at least a base `table` name; optional `column(name)` mapper; optional `edges` for path ops |
| `source` | may | `{ node, port }` — default: the sole core `input` node's `value` output |
| `sink` | may | `{ node, port }` — default: the sole core `output` node's `value` input |

Dialect is chosen by which compile entry the host calls, not by an options flag.

### DialectSqlOps (built by dialect entries)

| Op | Role |
| --- | --- |
| `defaultEdgePropertyExtract` | When `edges.property` is absent but `propertiesColumn` is set |
| `mergePropertyBags` | Traverse overlay of edge bag onto node bag |
| `defaultNodePropertiesJson` | When `schema.nodePropertiesJson` is absent |
| `defaultEdgePropertiesJson` | When `edges.propertiesJson` is absent but `propertiesColumn` is set |

### RelationalEdgesSchema

| Field | Type | Required |
| --- | --- | --- |
| `table` | string | must |
| `sourceColumn` | string | must |
| `targetColumn` | string | must |
| `typeColumn` | string | must |
| `propertiesColumn` | string | may — JSON/text bag of edge properties (simple hosts); prefer `property` / `propertiesJson` when fields are columns + EAV |
| `property` | `(alias, name) => string` | may — SQL expression for a logical edge property given the edges join alias; else dialect default extract |
| `propertiesJson` | `(alias) => string` | may — SQL expression for an edge property bag (traverse merge); else dialect default |

### RelationalSchema

| Field | Type | Required |
| --- | --- | --- |
| `table` | string | must — base relation for node collections |
| `column` | `(name: string) => string` | may — map logical column name to SQL expression or identifier |
| `edges` | `RelationalEdgesSchema` | may — required for `traverse` translation |
| `edgeType` | `(association: string, direction: number) => string` | may — map traverse association + direction → edges type filter value; default: association alone |
| `encodePropertyLiteral` | `(propertyKey: string, authorValue: PrimitiveValue) => PrimitiveValue` | may — map author enum label literals to stored values before SQL bind; default: identity |
| `nodePropertiesJson` | `(alias: string) => string` | may — SQL expression for a node row's JSON property bag used as the left side of traverse merge; else dialect default |
| `traverseKeepColumns` | `readonly string[]` | may — extra physical columns from `targets` when overlaying edge property bags (e.g. Tome SQLite `is_archived`); default none |

v1 has **no** Imp `from` node. The host collection is the graph boundary `input`; SQL still needs a `FROM` target, provided by `schema.table`. Path operators require `schema.edges`; source collection rows must expose an `id` column joined to `edges.sourceColumn`.

### Input resolution

For each input port, resolve in order (see [graph-model.md](https://github.com/silentorb/imp-spec/blob/main/docs/packages/imp-core-types/graph-model.md)):

1. Incoming edge (wired value)
2. Local `Node.inputs` literal
3. Catalog `Port.defaultValue`
4. Error if required and unsatisfied

### Translation rules (v1)

| NodeType | SQL effect |
| --- | --- |
| `input` | Base `SELECT … FROM schema.table` (passthrough entry) |
| `output` | Passthrough of its `value` input (sink) |
| `filter` | `WHERE` predicate |
| `except` | Keep rows from `collection` whose `id` is absent from `exclude`: compose both branches as SQL selects and apply anti-membership (`NOT EXISTS` correlating on `id`, or equivalent). Must **not** materialize `exclude` into an in-memory set |
| `sort` | `ORDER BY column ASC\|DESC` |
| `limit` | `LIMIT count` |
| `offset` | `OFFSET count` |
| `project` | `SELECT` listed columns (comma-separated `columns` string); otherwise `SELECT *`. When `schema.column` maps a logical name to a non-identifier expression (or a different identifier), the SELECT item is aliased to the logical name so result keys match |
| `group` | Passthrough of the upstream select plus `ORDER BY column ASC\|DESC` (same column mapping as `sort`). Partitioning into groups and enum-weight ordering are host concerns after execute |
| `traverse` | Join source collection through `schema.edges` filtered by `schema.edgeType(association, direction)` (default: `association`); `direction` must be `0` or `1`; select distinct target rows from `schema.table`. When `schema.edges.propertiesJson` or `propertiesColumn` is set, overlay hop-edge properties onto each target's property bag via the dialect's `mergePropertyBags(schema.nodePropertiesJson(targets) ?? dialect default, edgeBag)`. Optionally keep host `traverseKeepColumns`. When both `edge_property` and `edge_equals` are non-null, also filter with `schema.edges.property(path_edges, edge_property)` or the dialect default extract (`edge_property` must be a simple identifier) |
| `column` | Column reference via `schema.column` or identity |
| `literal` | Bound parameter / literal |
| `parameter` | Same as `literal` — bound parameter / literal from the node's `value` input (`label` is ignored by SQL) |
| `equals` / `not_equals` / `less_than` / `greater_than` | Comparison; when one side is a `column` and the other a literal/parameter, `schema.encodePropertyLiteral(columnName, literal)` is applied before bind when the hook is defined |
| `contains` | Substring match: `haystack LIKE '%' \|\| needle \|\| '%'` (escape `\`); shared portable form for both dialect entries |
| `search` | **Not translated** by generic `imp-sql` — host-delegated declarative retrieval; hosts intercept at compile or execute |
| `and` / `or` / `not` | Boolean combinators |

Unsupported or unknown `Node.type` values **must throw**. `traverse` **must throw** when `schema.edges` is absent. Both `collection` and `exclude` on `except` **must** be wired collection ports.

### Errors

Must throw on:

- Unknown node types
- Unsatisfied required inputs
- Missing / ambiguous default `input` or `output` boundary when `source` / `sink` omitted
- Cycles in the dependency walk

### Host schema binding

Hosts supply `RelationalSchema` that maps:

- Node collections → `schema.table`
- Edge hops → `schema.edges`
- Traverse `(association, direction)` → edges type filter via `edgeType` (Imp graphs keep association and direction separate; hosts may encode a packed type string at the SQL boundary)
- Property columns → expressions via `column` (host-specific extracts)
- Enum or label literals in comparisons → `encodePropertyLiteral` when stored values differ from author-facing labels
- Extra traverse columns → `traverseKeepColumns` when the host needs physical columns alongside a merged property bag

Host binders call the matching dialect entry (`compileSqlite` / `compilePostgres`), then execute via the host SQL executor. Shared lowering contains no host-specific code and no dialect SQL defaults.

## Design rationale

- **Specific → general:** dialect entries own placeholders and JSON idioms; shared helpers own graph walk and SELECT structure.
- SQL builder libraries (Kysely) keep dialect-aware compilation without tying Imp to a specific runtime DB API.
- Boundary `input`/`output` match collection → collection host integration without a table node in the graph.
- `compileSql` is the bridge for executors that only accept string SQL + params.
- Translation-first Postgres: precise SQL from documented Postgres / Imp contracts before store execute tests exist.

## Behavior / pipeline

1. Load registry with core library + collection transforms (+ pathing when needed) + any graph libraries.
2. Build an Imp graph: `input` → transforms / composites / `traverse` → `output`.
   - **Semantic paths:** when authoring with untagged ontology tokens, run `resolveSemanticPath` / `bindSemanticPath` (see [semantic-paths.md](https://github.com/silentorb/imp-spec/blob/main/docs/packages/imp-pathing/semantic-paths.md)) **before** this step so the graph already contains technical `traverse` / `project` / `column` nodes. SQL translation does not resolve semantic tokens.
3. **`flattenGraph(graph, registry)`** — expand graph-backed node references (see [resolve.md](https://github.com/silentorb/imp-spec/blob/main/docs/packages/imp-graph-resolve/resolve.md)).
4. Host builds `RelationalSchema`, then calls `compileSqlite` or `compilePostgres`.
5. `compileSql(query)` → run against a DB (when the host has an executor).

## Configuration

None beyond host `SqlHostCompileOptions` and which dialect entry is called.

## See also

- [resolve.md](https://github.com/silentorb/imp-spec/blob/main/docs/packages/imp-graph-resolve/resolve.md) — nested graph flattening before translation
- [collection-transforms.md](https://github.com/silentorb/imp-spec/blob/main/docs/packages/imp-collection-transforms/collection-transforms.md)
- [pathing.md](https://github.com/silentorb/imp-spec/blob/main/docs/packages/imp-pathing/pathing.md)
- [semantic-paths.md](https://github.com/silentorb/imp-spec/blob/main/docs/packages/imp-pathing/semantic-paths.md) — ontology bind before translation
- [graph-model.md](https://github.com/silentorb/imp-spec/blob/main/docs/packages/imp-core-types/graph-model.md)
- [execution.md](./execution.md)
- Root [AGENTS.md](../../AGENTS.md)
