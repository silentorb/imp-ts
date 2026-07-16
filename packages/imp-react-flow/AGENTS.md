# imp-react-flow — agent notes

## What it is

Runtime converters between Imp `Graph` and React Flow `{ nodes, edges }`. Uses `@xyflow/react` for **types** (`Node`, `Edge`); this package does not ship React components.

## Specs vs code

| Layer | Location | Regenerated? |
| --- | --- | --- |
| Human/agent specs | [`docs/features/react-flow.md`](../../docs/features/react-flow.md) | No — authored source of truth |
| Converter implementation | `src/*.ts` | Implement to match the react-flow feature doc |

Core Imp shapes (`Graph`, `Port`, `Ports`, `SignalType`) come from [`imp-spec`](../imp-spec/) / [graph-model.md](../../docs/features/graph-model.md).

## Layout

| Path | Contents |
| --- | --- |
| `src/types.ts` | `ImpReactFlowNodeData` (`inputs` / `outputs` as Imp `Ports`) |
| `src/convert.ts` | `impToReactFlow`, `reactFlowToImp` |
| `src/index.ts` | Public re-exports |
| `src/*.test.ts` | Round-trip tests |

## Run

```bash
bun run typecheck
bun test
```

From repo root: `bun run typecheck`, `bun test` (when wired).

## See also

- [react-flow.md](../../docs/features/react-flow.md)
- [graph-model.md](../../docs/features/graph-model.md)
- Root [AGENTS.md](../../AGENTS.md)
