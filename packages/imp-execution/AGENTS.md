# imp-execution — agent notes

## What it is

Dynamic runtime for Imp collection/path graphs. Walks the DAG, dispatches registered node types, and produces collection results via a **host-supplied read-only data source**. Successor to imp-kotlin's execution engine (graph layer only).

## Specs vs code

| Layer | Location | Regenerated? |
| --- | --- | --- |
| Language-neutral spec | [`imp-spec` execution](../../imp-spec/docs/packages/imp-execution/execution.md) | No |
| Implementation | `src/*.ts` | Implement to match spec |

## Layout

| Path | Contents |
| --- | --- |
| `src/execute.ts` | `executeGraph`, step preparation |
| `src/host.ts` | `ExecutionHost`, `ExecutionCapabilities`, `ExecutionRow` |
| `src/eval/` | Per-node-type evaluators |
| `src/index.ts` | Public re-exports |
| `src/*.test.ts` | Pipeline + host contract tests |

## Run

```bash
bun run typecheck
bun test
```

From repo root: `bun run typecheck`, `bun test`.

## See also

- [execution.md](../../imp-spec/docs/packages/imp-execution/execution.md)
- [sql.md](../../imp-spec/docs/packages/imp-sql/sql.md)
- [collection-transforms.md](../../imp-spec/docs/packages/imp-collection-transforms/collection-transforms.md)
- [pathing.md](../../imp-spec/docs/packages/imp-pathing/pathing.md)
- Root [AGENTS.md](../../AGENTS.md)
