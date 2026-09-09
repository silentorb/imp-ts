# imp-registry — agent notes

## What it is

Runtime helpers to **load** `NodeLibrary` values and **look up** `NodeType`s. Depends on `imp-core-types` library interfaces; library packages must not depend on this package.

## Specs vs code

| Layer | Location | Regenerated? |
| --- | --- | --- |
| Language-neutral spec | [`imp-spec` registry](https://github.com/silentorb/imp-spec/blob/main/docs/packages/imp-registry/registry.md) | No |
| Implementation | `src/*.ts` | Implement to match spec |

`NodeType` / `NodeLibrary` shapes come from [`imp-core-types`](../imp-core-types/) / [node-libraries.md](https://github.com/silentorb/imp-spec/blob/main/docs/packages/imp-core-types/node-libraries.md).

## Layout

| Path | Contents |
| --- | --- |
| `src/registry.ts` | `createRegistry`, `loadLibrary`, get/list helpers |
| `src/index.ts` | Public re-exports |
| `src/*.test.ts` | Load, lookup, conflict, immutability |

## Quick start

```ts
import type { NodeLibrary } from "imp-core-types"
import {
  createRegistry,
  loadLibrary,
  getNodeType,
} from "imp-registry"

const library: NodeLibrary = {
  id: "example",
  types: {
    source: {
      id: "source",
      inputs: {},
      outputs: { out: { id: "out", type: { id: "signal" } } },
    },
  },
}

const registry = loadLibrary(createRegistry(), library)
getNodeType(registry, "source")
```

## Run

```bash
bun run typecheck
bun test
```

Tests cover empty registry, successful load/lookup, and conflict on duplicate `NodeTypeId`.

## See also

- [registry.md](https://github.com/silentorb/imp-spec/blob/main/docs/packages/imp-registry/registry.md)
- [node-libraries.md](https://github.com/silentorb/imp-spec/blob/main/docs/packages/imp-core-types/node-libraries.md)
- [graph-model.md](https://github.com/silentorb/imp-spec/blob/main/docs/packages/imp-core-types/graph-model.md)
- Root [AGENTS.md](../../AGENTS.md)
