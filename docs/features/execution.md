# Dynamic execution (imp-execution)

## Summary

**`imp-execution`** is the TypeScript dynamic runtime for Imp collection/path graphs — the successor to imp-kotlin's [`imp/execution`](https://github.com/silentorb/imp-kotlin/tree/master/projects/execution/src/main/kotlin/silentorb/imp/execution). It walks the Imp DAG, dispatches registered node types, and produces collection results via a **host-supplied read-only data source**.

Pair with **`imp-sql`** (compile → SQL) as the two read backends for the same Imp graph IR.

## When to read this

- Implementing or changing `packages/imp-execution`
- Binding Tome flatfile or other stores as execution hosts
- Sandboxing / effects policy for runtime evaluation

## Requirements

### Scope (v1)

Must execute graphs using:

- `imp.core` boundary nodes (`input`, `output`)
- `imp.collection.transforms` (`filter`, `sort`, `limit`, `offset`, `project`, `except`, predicates, …)
- `imp.pathing` (`traverse` — single hop)

Must **not** revive imp-kotlin language-layer execution (functions, inlining, full type interpreter).

### API

| Operation | Behavior |
| --- | --- |
| `executeGraph(graph, options)` | Topologically execute from configured source → sink; return `{ columns, rows }` |
| `ExecutionHost` | Read-only host: enumerate input collection, follow edges for traverse |
| `ExecutionCapabilities` | Default `{ read: true, write: false }`; extension point for future effect grants |

### Host contract (read-only v1)

```typescript
interface ExecutionRow {
  id: string;
  properties: Record<string, unknown>;
  is_archived?: boolean;
}

interface ExecutionHost {
  /** Initial collection for boundary `input` (e.g. all live nodes). */
  listInputRows(): ExecutionRow[] | Promise<ExecutionRow[]>;
  /** One hop: targets reachable from sourceId matching association + direction. */
  traverse(
    sourceId: string,
    association: string,
    direction: 0 | 1,
    edgeProperty?: string | null,
    edgeEquals?: unknown,
  ): ExecutionRow[] | Promise<ExecutionRow[]>;
}
```

Hosts **must not** expose write/delete/file I/O on the default query path.

### Sandboxing and discrete effects

Imp effects **must** be discrete — behavior from graph + explicit host bindings, not ambient mutation.

1. **No ambient environment** — runtime holds no filesystem, network, or mutable singleton handles.
2. **Operator purity classes** — pure transforms vs host-data reads vs (future) effectful ops requiring capability grants.
3. **Default-deny capabilities** — `ExecutionCapabilities` reserved for granular flags (`mutateGraph`, `externalIO`, …) and future language-level effect annotations.
4. **Parity with imp-sql** — default effect profile is read-only (SELECT-shaped); queries return collections without mutating backing stores.

v1 may enforce only structural sandboxing (narrow read-only host API); specs **must** document the extension point before effectful operators ship.

### Terminology

Use **execute** / **execution**, not **interpret** — active DAG evaluation, not passive decoding.

**Compile** (`imp-sql`) vs **execute** (`imp-execution`).

## Design rationale

- imp-kotlin had a general execution engine; imp-ts kept catalogs + SQL lowering only.
- Flatfile integrators need the same Imp graphs without SQLite — execution fills the gap.
- Operator semantics live once in `imp-execution`; hosts (`tome-imp-flatfile`, etc.) supply rows/edges only.
- Sandboxing is design-first so runtime evaluation does not become an implicit mutation channel.

## Behavior / pipeline

1. Host builds `Registry` (core + collection.transforms + pathing).
2. Caller invokes `executeGraph(graph, { registry, host, capabilities })`.
3. Runtime resolves inputs (same order as imp-sql: edge → local literal → catalog default).
4. Dispatches node types; `traverse` calls `host.traverse`.
5. Returns `{ columns: string[]; rows: Record<string, unknown>[] }`.

## Inputs / outputs / artifacts

| Artifact | Role |
| --- | --- |
| This doc | Authoritative execution + sandbox spec |
| `packages/imp-execution` | Implementation |

## Verification

```bash
cd packages/imp-execution && bun test
```

## Implementation pointers

| Path | Contents |
| --- | --- |
| `packages/imp-execution/src/execute.ts` | `executeGraph`, step preparation |
| `packages/imp-execution/src/host.ts` | `ExecutionHost`, `ExecutionCapabilities` |
| `packages/imp-execution/src/eval/` | Per-node-type evaluators |

## See also

- [sql.md](./sql.md) — compile-time lowering
- [collection-transforms.md](./collection-transforms.md)
- [pathing.md](./pathing.md)
- [Tome graph-store.md](../../../tome/docs/features/graph-store.md)
