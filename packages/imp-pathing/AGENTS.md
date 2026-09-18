# imp-pathing — agent notes

## What it is

A catalog package that exports `pathingLibrary` (`NodeLibrary`) plus ontology-resolved semantic path bind/desugar helpers. No execution or SQL logic in the helpers — they emit `traverse` / `project` fragments for Translators.

## Specs vs code

| Layer | Location | Regenerated? |
| --- | --- | --- |
| Language-neutral `traverse` catalog | [`imp-spec` pathing](https://github.com/silentorb/imp-spec/blob/main/docs/packages/imp-pathing/pathing.md) | No |
| Semantic path bind / desugar | [`imp-spec` semantic-paths](https://github.com/silentorb/imp-spec/blob/main/docs/packages/imp-pathing/semantic-paths.md) | No |
| Library data | `src/library.ts` | Implement to match pathing spec |
| Resolve / desugar / bind | `src/resolve.ts`, `src/desugar.ts`, `src/bind.ts` | Implement to match semantic-paths spec |

## Layout

| Path | Contents |
| --- | --- |
| `src/library.ts` | `pathingLibrary` |
| `src/resolve.ts` | `PathOntology`, `resolveSemanticPath`, `mapPathOntology` |
| `src/desugar.ts` | `desugarPath`, `mergeDesugarIntoGraph` |
| `src/bind.ts` | `bindSemanticPath` (resolve + desugar) |
| `src/index.ts` | Public re-exports |
| `src/*.test.ts` | Catalog shape, resolve/desugar, SQL round-trip |

## Quick start

```ts
import {
  pathingLibrary,
  bindSemanticPath,
  mapPathOntology,
  mergeDesugarIntoGraph,
} from "imp-pathing"
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

const ontology = mapPathOntology({
  Feature: {
    title: { kind: "property", name: "title" },
    dependencies: {
      kind: "relationship",
      association: "01…",
      direction: 0,
      nextType: "Feature",
    },
  },
})

const fragment = bindSemanticPath(["dependencies", "title"], {
  ontology,
  startType: "Feature",
  prefix: "p",
  source: { node: "in", port: "value" },
})
```

Use `asScalar: true` when a node endpoint should project `id` without an author `.id` token.

## Run

```bash
bun run typecheck
bun test
```

## See also

- [pathing.md](https://github.com/silentorb/imp-spec/blob/main/docs/packages/imp-pathing/pathing.md)
- [semantic-paths.md](https://github.com/silentorb/imp-spec/blob/main/docs/packages/imp-pathing/semantic-paths.md)
- [sql.md](../../docs/features/sql.md)
- Root [AGENTS.md](../../AGENTS.md)
