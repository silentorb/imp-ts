# imp-sql — agent notes

## What it is

Runtime lowering of Imp collection-transform and pathing graphs to Kysely select queries, plus `compileSql` for SQL string + bindings.

## Specs vs code

| Layer | Location | Regenerated? |
| --- | --- | --- |
| Human/agent specs | [`docs/features/sql.md`](../../docs/features/sql.md) | No — authored source of truth |
| Implementation | `src/*.ts` | Implement to match the sql feature doc |

## Layout

| Path | Contents |
| --- | --- |
| `src/compile.ts` | `graphToKysely`, `compileSql` |
| `src/resolve.ts` | Edge index, boundary defaults, input resolution |
| `src/schema.ts` | `RelationalSchema` |
| `src/lower/` | Collection + expression lowering |
| `src/*.test.ts` | Pipeline + error tests |

## Run

```bash
bun run typecheck
bun test
```

## See also

- [sql.md](../../docs/features/sql.md)
- [collection-transforms.md](../../docs/features/collection-transforms.md)
- [pathing.md](../../docs/features/pathing.md)
- Root [AGENTS.md](../../AGENTS.md)
