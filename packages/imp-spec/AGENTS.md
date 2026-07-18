# imp-spec — agent notes

## What it is

**Code interfaces** for the Imp graph model (`Graph`, `Node`, `Edge`, ports, signal types, `InputValues`) and node type libraries (`NodeType`, `NodeLibrary`), plus the core boundary library (`coreNodeLibrary`).

## Specs vs code

| Layer | Location | Regenerated? |
| --- | --- | --- |
| Human/agent specs | [`docs/features/graph-model.md`](../../docs/features/graph-model.md), [`docs/features/node-libraries.md`](../../docs/features/node-libraries.md) | No — authored source of truth |
| TypeScript interfaces / core library | `src/*.ts` | Yes — regenerate from the matching feature doc |

When the model changes, update the feature doc first, then regenerate or edit the TypeScript interfaces to match. Specs must stay precise enough to emit equivalent interfaces in other languages (Python, Rust, etc.); this package is the TypeScript binding only.

## Layout

| Path | Contents |
| --- | --- |
| `src/graph.ts` | Id aliases, `SignalType`, `Port` / `Ports`, `InputValues`, `Node`, `Edge`, `Graph` |
| `src/library.ts` | `NodeType`, `NodeLibrary` |
| `src/core-library.ts` | `coreNodeLibrary` (`input`, `output` boundary types) |
| `src/index.ts` | Public re-exports |

## Run

```bash
bun run typecheck
bun test
```

## See also

- [graph-model.md](../../docs/features/graph-model.md)
- [node-libraries.md](../../docs/features/node-libraries.md)
- [registry.md](../../docs/features/registry.md) — load/lookup in `imp-registry`
- [react-flow.md](../../docs/features/react-flow.md) — Imp ↔ React Flow converters
- Root [AGENTS.md](../../AGENTS.md)
