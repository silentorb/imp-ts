# imp-registry — agent notes

## What it is

Runtime helpers to **load** `NodeLibrary` values and **look up** `NodeType`s. Depends on `imp-spec` library interfaces; library packages must not depend on this package.

## Specs vs code

| Layer | Location | Regenerated? |
| --- | --- | --- |
| Human/agent specs | [`docs/features/registry.md`](../../docs/features/registry.md) | No — authored source of truth |
| Implementation | `src/*.ts` | Implement to match the registry feature doc |

`NodeType` / `NodeLibrary` shapes come from [`imp-spec`](../imp-spec/) / [node-libraries.md](../../docs/features/node-libraries.md).

## Layout

| Path | Contents |
| --- | --- |
| `src/registry.ts` | `createRegistry`, `loadLibrary`, get/list helpers |
| `src/index.ts` | Public re-exports |
| `src/*.test.ts` | Load, lookup, conflict, immutability |

## Run

```bash
bun run typecheck
bun test
```

From repo root: `bun run typecheck`, `bun test`.

## See also

- [registry.md](../../docs/features/registry.md)
- [node-libraries.md](../../docs/features/node-libraries.md)
- [graph-model.md](../../docs/features/graph-model.md)
- Root [AGENTS.md](../../AGENTS.md)
