# Dynamic execution

## Summary

**`imp-execution`** is a **runtime consumer** (not an Imp Translator) — it walks Imp collection/path graphs in place, dispatches registered node types, and produces collection results via a **host-supplied read-only data source**. Successor to imp-kotlin's execution engine (graph layer only).

Pair with **`imp-sql`** (Imp → SQL Translator) as an alternative read path for the same Imp graph IR. Future direction may favor translating to a specialized runtime format instead of executing the original graph.

## When to read this

- Implementing or changing dynamic execution
- Binding flatfile or other stores as execution hosts
- Sandboxing / effects policy for runtime evaluation

## Requirements

### Scope (v1)

Must execute graphs using:

- `imp.core` boundary nodes (`input`, `output`)
- `imp.collection.transforms` (`filter`, `sort`, `limit`, `offset`, `project`, `except`, `search`, predicates including `contains`, …)
- `imp.pathing` (`traverse` — single hop)

Must **not** revive imp-kotlin language-layer execution (functions, inlining, full type interpreter).

### API

| Operation | Behavior |
| --- | --- |
| `executeGraph(graph, options)` | Topologically execute from configured source → sink; return `{ columns, rows }` |
| `ExecutionHost` | Read-only host: enumerate input collection, follow edges for traverse |
| `ExecutionCapabilities` | Default `{ read: true, write: false }`; extension point for future effect grants |

### ExecutionRow

| Field | Type | Required |
| --- | --- | --- |
| `id` | string | must |
| `properties` | map string → unknown | must |
| `is_archived` | boolean | may |

### ExecutionHost (read-only v1)

| Operation | Behavior |
| --- | --- |
| `listInputRows()` | Initial collection for boundary `input` (e.g. all live rows). Returns `ExecutionRow[]` or async equivalent. |
| `traverse(sourceId, association, direction, edgeProperty?, edgeEquals?)` | One hop: targets reachable from `sourceId` matching association + direction (`direction` is `0` or `1`). Returns `ExecutionRow[]` or async equivalent. |
| `textSearch?(rows, query)` | Declarative text search over a collection. **Required** when graphs use the `search` transform. Host defines ranking, field coverage, and fuzzy behavior. |

Hosts **must not** expose write/delete/file I/O on the default query path.

### Sandboxing and discrete effects

Imp effects **must** be discrete — behavior from graph + explicit host bindings, not ambient mutation.

1. **No ambient environment** — runtime holds no filesystem, network, or mutable singleton handles.
2. **Operator purity classes** — pure transforms vs host-data reads vs (future) effectful ops requiring capability grants.
3. **Default-deny capabilities** — `ExecutionCapabilities` reserved for granular flags (`mutateGraph`, `externalIO`, …) and future language-level effect annotations.
4. **Parity with imp-sql** — default effect profile is read-only (SELECT-shaped); queries return collections without mutating backing stores.

v1 may enforce only structural sandboxing (narrow read-only host API); specs **must** document the extension point before effectful operators ship. v1 has **no Imp mutation operators** — hosts that need writes use imperative APIs outside Imp execution.

### Terminology

Use **execute** / **execution**, not **interpret** — active DAG evaluation, not passive decoding.

**Translate** (`imp-sql`) vs **execute** (`imp-execution`).

## Design rationale

- imp-kotlin had a general execution engine; early Imp bindings kept catalogs + SQL translation only.
- Flatfile integrators need the same Imp graphs without a relational backend — execution fills the gap.
- Operator semantics live once in `imp-execution`; host adapters supply rows/edges only.
- Sandboxing is design-first so runtime evaluation does not become an implicit mutation channel.

## Behavior / pipeline

1. Host builds `Registry` (core + collection.transforms + pathing + graph libraries).
2. **`buildExecutionProgram(graph, registry)`** — shared subgraph table (see [resolve.md](../../imp-spec/docs/packages/imp-graph-resolve/resolve.md)).
3. Caller invokes `executeGraph(program, { registry, host, capabilities })`.
4. Runtime resolves inputs (same order as imp-sql: edge → local literal → catalog default).
5. Dispatches node types; graph-backed nodes enter shared subgraphs; `traverse` calls `host.traverse`.
6. Returns `{ columns: string[]; rows: Record<string, unknown>[] }`.

## Configuration

None.

## See also

- [resolve.md](../../imp-spec/docs/packages/imp-graph-resolve/resolve.md) — execution program with shared subgraphs
- [sql.md](./sql.md) — compile-time SQL translation
- [collection-transforms.md](../../imp-spec/docs/packages/imp-collection-transforms/collection-transforms.md)
- [pathing.md](../../imp-spec/docs/packages/imp-pathing/pathing.md)
- Root [AGENTS.md](../../AGENTS.md)
