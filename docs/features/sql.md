# SQL translation

## Summary

**`imp-sql`** is an **Imp Translator** — it translates Imp graphs that use core boundary nodes, `imp-collection-transforms`, and `imp-pathing` into SQL. The compile API walks the DAG and produces a dialect-aware select query; a helper exposes SQL string + bindings for hosts that execute raw SQL.

## When to read this

- Implementing or changing Imp → SQL translation
- Wiring collection-transform graphs to a relational backend
- Designing host `RelationalSchema` bindings

## Requirements

### API

| Operation | Behavior |
| --- | --- |
| `graphToSql(graph, options)` | Walk the DAG from boundary source → sink; translate supported node types into a select query; return compiled query handle |
| `compileSql(query)` | Return `{ sql: string; parameters: readonly unknown[] }` from a compiled query |

Language bindings may name the compile step differently (e.g. `graphToKysely` when using Kysely).

### SqlCompileOptions

| Field | Required | Behavior |
| --- | --- | --- |
| `registry` | must | Must include `imp.core` and `imp.collection.transforms` (and `imp.pathing` when using path ops) |
| `schema` | must | `RelationalSchema` — at least a base `table` name; optional `column(name)` mapper; optional `edges` for path ops |
| `source` | may | `{ node, port }` — default: the sole core `input` node's `value` output |
| `sink` | may | `{ node, port }` — default: the sole core `output` node's `value` input |
| `dialect` | may | Default `"sqlite"`. Other dialects may be added later |

### RelationalEdgesSchema

| Field | Type | Required |
| --- | --- | --- |
| `table` | string | must |
| `sourceColumn` | string | must |
| `targetColumn` | string | must |
| `typeColumn` | string | must |
| `propertiesColumn` | string | may — JSON/text column of edge properties for optional traverse edge filters |

### RelationalSchema

| Field | Type | Required |
| --- | --- | --- |
| `table` | string | must — base relation for node collections |
| `column` | `(name: string) => string` | may — map logical column name to SQL expression or identifier |
| `edges` | `RelationalEdgesSchema` | may — required for `traverse` translation |
| `edgeType` | `(association: string, direction: number) => string` | may — map traverse association + direction → edges type filter value; default: association alone |
| `encodePropertyLiteral` | `(propertyKey: string, authorValue: PrimitiveValue) => PrimitiveValue` | may — map author enum label literals to stored values before SQL bind; default: identity |

v1 has **no** Imp `from` node. The host collection is the graph boundary `input`; SQL still needs a `FROM` target, provided by `schema.table`. Path operators require `schema.edges`; source collection rows must expose an `id` column joined to `edges.sourceColumn`.

### Input resolution

For each input port, resolve in order (see [graph-model.md](../../imp-spec/docs/packages/imp-core-types/graph-model.md)):

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
| `project` | `SELECT` listed columns (comma-separated `columns` string); otherwise `SELECT *`. When `schema.column` maps a logical name to a non-identifier expression (or a different identifier), the SELECT item is aliased to the logical name so result keys match (`json_extract(…) AS title`) |
| `group` | Passthrough of the upstream select plus `ORDER BY column ASC\|DESC` (same column mapping as `sort`). Partitioning into groups and enum-weight ordering are host concerns after execute |
| `traverse` | Join source collection through `schema.edges` filtered by `schema.edgeType(association, direction)` (default: `association`); `direction` must be `0` or `1`; select distinct target rows from `schema.table`. When `schema.edges.propertiesColumn` is set, overlay hop-edge JSON onto each target's `properties` via `json_patch` so later `project` / `group` / `column` can read hop properties. When both `edge_property` and `edge_equals` are non-null, also add `json_extract(path_edges.{propertiesColumn}, '$.{edge_property}') = edge_equals` to the hop join (`edge_property` must be a simple identifier) |
| `column` | Column reference via `schema.column` or identity |
| `literal` | Bound parameter / literal |
| `parameter` | Same as `literal` — bound parameter / literal from the node's `value` input (`label` is ignored by SQL) |
| `equals` / `not_equals` / `less_than` / `greater_than` | Comparison; when one side is a `column` and the other a literal/parameter, `schema.encodePropertyLiteral(columnName, literal)` is applied before bind when the hook is defined |
| `contains` | Substring match: `haystack LIKE '%' \|\| needle \|\| '%'` (escape `\`); adapters may use equivalent SQL |
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
- Property columns → expressions via `column` (e.g. `json_extract(properties, '$.…')`)
- Enum or label literals in comparisons → `encodePropertyLiteral` when stored values differ from author-facing labels

Compiled SQL + bindings are consumed by the host's SQL executor. Generic `imp-sql` contains no host-specific code.

## Design rationale

- SQL builder libraries keep dialect-aware translation without tying Imp to a specific runtime DB API.
- Boundary `input`/`output` match collection → collection host integration without a table node in the graph.
- `compileSql` is the bridge for executors that only accept string SQL + params.

## Behavior / pipeline

1. Load registry with core library + collection transforms (+ pathing when needed) + any graph libraries.
2. Build an Imp graph: `input` → transforms / composites / `traverse` → `output`.
3. **`flattenGraph(graph, registry)`** — expand graph-backed node references (see [resolve.md](../../imp-spec/docs/packages/imp-graph-resolve/resolve.md)).
4. `graphToSql(flatGraph, { registry, schema: { table: "items", edges?: … } })`.
5. `compileSql(query)` → run against a DB.

## Configuration

None beyond `SqlCompileOptions`.

## See also

- [resolve.md](../../imp-spec/docs/packages/imp-graph-resolve/resolve.md) — nested graph flattening before translation
- [collection-transforms.md](../../imp-spec/docs/packages/imp-collection-transforms/collection-transforms.md)
- [pathing.md](../../imp-spec/docs/packages/imp-pathing/pathing.md)
- [graph-model.md](../../imp-spec/docs/packages/imp-core-types/graph-model.md)
- [execution.md](./execution.md)
- Root [AGENTS.md](../../AGENTS.md)
