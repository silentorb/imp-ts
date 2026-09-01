# imp-execution — agent notes

## What it is

**Runtime consumer** (not an Imp Translator) — walks Imp collection/path graphs in place, dispatches registered node types, and produces collection results via a **host-supplied read-only data source**. Successor to imp-kotlin's execution engine (graph layer only).

## Specs vs code

| Layer | Location | Regenerated? |
| --- | --- | --- |
| Spec | [execution.md](../../docs/features/execution.md) | No |
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

- [execution.md](../../docs/features/execution.md)
- [sql.md](../../docs/features/sql.md)
- [collection-transforms.md](../../imp-spec/docs/packages/imp-collection-transforms/collection-transforms.md)
- [pathing.md](../../imp-spec/docs/packages/imp-pathing/pathing.md)
- Root [AGENTS.md](../../AGENTS.md)
