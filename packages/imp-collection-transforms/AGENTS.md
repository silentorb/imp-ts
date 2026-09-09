# imp-collection-transforms — agent notes

## What it is

A catalog package that exports `collectionTransformsLibrary` (`NodeLibrary`). No execution or SQL logic.

## Specs vs code

| Layer | Location | Regenerated? |
| --- | --- | --- |
| Language-neutral spec | [`imp-spec` collection-transforms](https://github.com/silentorb/imp-spec/blob/main/docs/packages/imp-collection-transforms/collection-transforms.md) | No |
| Library data | `src/library.ts` | Implement to match spec |

## Layout

| Path | Contents |
| --- | --- |
| `src/library.ts` | `collectionTransformsLibrary` |
| `src/index.ts` | Public re-exports |
| `src/*.test.ts` | Shape + registry load |

## Quick start

```ts
import { collectionTransformsLibrary } from "imp-collection-transforms"
import { coreNodeLibrary } from "imp-core-types"
import { createRegistry, loadLibrary } from "imp-registry"

const registry = loadLibrary(
  loadLibrary(createRegistry(), coreNodeLibrary),
  collectionTransformsLibrary,
)
```

## Run

```bash
bun run typecheck
bun test
```

Tests cover library shape and successful `imp-registry` load.

## See also

- [collection-transforms.md](https://github.com/silentorb/imp-spec/blob/main/docs/packages/imp-collection-transforms/collection-transforms.md)
- [sql.md](../../docs/features/sql.md)
- Root [AGENTS.md](../../AGENTS.md)
