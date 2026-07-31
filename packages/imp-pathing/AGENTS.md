# imp-pathing — agent notes

## What it is

A catalog package that exports `pathingLibrary` (`NodeLibrary`). No execution or SQL logic.

## Specs vs code

| Layer | Location | Regenerated? |
| --- | --- | --- |
| Human/agent specs | [`docs/features/pathing.md`](../../docs/features/pathing.md) | No — authored source of truth |
| Library data | `src/library.ts` | Implement to match the feature doc |

## Layout

| Path | Contents |
| --- | --- |
| `src/library.ts` | `pathingLibrary` |
| `src/index.ts` | Public re-exports |
| `src/*.test.ts` | Shape + registry load |

## Run

```bash
bun run typecheck
bun test
```

## See also

- [pathing.md](../../docs/features/pathing.md)
- [sql.md](../../docs/features/sql.md)
- Root [AGENTS.md](../../AGENTS.md)
