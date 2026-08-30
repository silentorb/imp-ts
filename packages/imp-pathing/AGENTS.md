# imp-pathing — agent notes

## What it is

A catalog package that exports `pathingLibrary` (`NodeLibrary`). No execution or SQL logic.

## Specs vs code

| Layer | Location | Regenerated? |
| --- | --- | --- |
| Language-neutral spec | [`imp-spec` pathing](../../imp-spec/docs/packages/imp-pathing/pathing.md) | No |
| Library data | `src/library.ts` | Implement to match spec |

## Layout

| Path | Contents |
| --- | --- |
| `src/library.ts` | `pathingLibrary` |
| `src/index.ts` | Public re-exports |
| `src/*.test.ts` | Shape + registry load |

## Quick start

```ts
import { pathingLibrary } from "imp-pathing"
import { collectionTransformsLibrary } from "imp-collection-transforms"
import { coreNodeLibrary } from "imp-core-types"
import { createRegistry, loadLibrary } from "imp-registry"

const registry = loadLibrary(
  loadLibrary(
    loadLibrary(createRegistry(), coreNodeLibrary),
    collectionTransformsLibrary,
  ),
  pathingLibrary,
)
```

## Run

```bash
bun run typecheck
bun test
```

Tests cover library shape and successful `imp-registry` load.

## See also

- [pathing.md](../../imp-spec/docs/packages/imp-pathing/pathing.md)
- [sql.md](../../imp-spec/docs/packages/imp-sql/sql.md)
- Root [AGENTS.md](../../AGENTS.md)
