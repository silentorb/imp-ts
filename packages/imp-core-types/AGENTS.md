# imp-core-types — agent notes

## What it is

**Core type interfaces** for the Imp graph model (`Graph`, `Node`, `Edge`, ports, signal types, `InputValues`) and node type libraries (`NodeType`, `NodeLibrary`), plus the core boundary library (`coreNodeLibrary`). This package is the TypeScript binding.

## Specs vs code

| Layer | Location | Regenerated? |
| --- | --- | --- |
| Language-neutral specs | [`imp-spec` graph-model](../../imp-spec/docs/packages/imp-core-types/graph-model.md), [node-libraries](../../imp-spec/docs/packages/imp-core-types/node-libraries.md) | No — authored in imp-spec |
| TypeScript interfaces / core library | `src/*.ts` | Yes — regenerate from spec |

When the model changes, update imp-spec first, then regenerate or edit the TypeScript interfaces to match.

## Layout

| Path | Contents |
| --- | --- |
| `src/graph.ts` | Id aliases, `SignalType`, `Port` / `Ports`, `InputValues`, `Node`, `Edge`, `Graph` |
| `src/library.ts` | `NodeType`, `NodeLibrary` |
| `src/core-library.ts` | `coreNodeLibrary` (`input`, `output`, `parameter` boundary types) |
| `src/index.ts` | Public re-exports |

## Quick start

```ts
import type { Graph } from "imp-core-types"
import { coreNodeLibrary } from "imp-core-types"

const graph: Graph = {
  nodes: {
    in: { id: "in", type: "input", inputs: {} },
    out: { id: "out", type: "output", inputs: {} },
  },
  edges: {
    e1: {
      from: { node: "in", port: "value" },
      to: { node: "out", port: "value" },
    },
  },
}

void coreNodeLibrary
```

## Run

```bash
bun run typecheck
bun test
```

Types in `imp-core-types` must match the field tables in imp-spec graph-model and node-libraries docs.

## See also

- [graph-model.md](../../imp-spec/docs/packages/imp-core-types/graph-model.md)
- [node-libraries.md](../../imp-spec/docs/packages/imp-core-types/node-libraries.md)
- [registry.md](../../imp-spec/docs/packages/imp-registry/registry.md)
- [react-flow.md](../../imp-spec/docs/packages/imp-react-flow/react-flow.md)
- Root [AGENTS.md](../../AGENTS.md)
