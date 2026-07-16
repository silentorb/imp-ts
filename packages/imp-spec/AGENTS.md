# imp-spec — agent notes

## What it is

**Code interfaces** for the Imp graph model (`Graph`, `Node`, `Edge`, ports, signal types). Types only — no runtime validation or conversion logic.

## Specs vs code

| Layer | Location | Regenerated? |
| --- | --- | --- |
| Human/agent specs | [`docs/features/graph-model.md`](../../docs/features/graph-model.md) | No — authored source of truth |
| TypeScript interfaces | `src/*.ts` | Yes — regenerate from the graph-model spec |

When the model changes, update the feature doc first, then regenerate or edit the TypeScript interfaces to match. Specs must stay precise enough to emit equivalent interfaces in other languages (Python, Rust, etc.); this package is the TypeScript binding only.

## Layout

| Path | Contents |
| --- | --- |
| `src/graph.ts` | Id aliases, `SignalType`, `Port` / `Ports`, `Node`, `Edge`, `Graph` |
| `src/index.ts` | Public re-exports |

## Run

```bash
bun run typecheck   # from this package or via root `bun run typecheck`
```

## See also

- [graph-model.md](../../docs/features/graph-model.md)
- [react-flow.md](../../docs/features/react-flow.md) — Imp ↔ React Flow converters
- Root [AGENTS.md](../../AGENTS.md)
