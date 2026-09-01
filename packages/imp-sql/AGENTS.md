# imp-sql — agent notes

## What it is

**Imp Translator** — translates Imp collection-transform and pathing graphs to Kysely select queries, plus `compileSql` for SQL string + bindings.

## Specs vs code

| Layer | Location | Regenerated? |
| --- | --- | --- |
| Spec | [sql.md](../../docs/features/sql.md) | No |
| Implementation | `src/*.ts` | Implement to match spec |

TypeScript API: `graphToKysely` (spec name: `graphToSql`), `compileSql`. Uses [Kysely](https://kysely.dev/); default dialect SQLite.

## Layout

| Path | Contents |
| --- | --- |
| `src/compile.ts` | `graphToKysely`, `compileSql` |
| `src/resolve.ts` | Edge index, boundary defaults, input resolution |
| `src/schema.ts` | `RelationalSchema` |
| `src/lower/` | Collection + expression translation |
| `src/*.test.ts` | Pipeline + error tests |

## Quick start

```ts
import { coreNodeLibrary } from "imp-core-types"
import { collectionTransformsLibrary } from "imp-collection-transforms"
import { pathingLibrary } from "imp-pathing"
import { createRegistry, loadLibrary } from "imp-registry"
import { graphToKysely, compileSql } from "imp-sql"

const registry = loadLibrary(
  loadLibrary(
    loadLibrary(createRegistry(), coreNodeLibrary),
    collectionTransformsLibrary,
  ),
  pathingLibrary,
)

const compiled = graphToKysely(graph, {
  registry,
  schema: { table: "items" },
})
const { sql, parameters } = compileSql(compiled)
```

## Run

```bash
bun run typecheck
bun test
```

Tests cover `input` → `filter` → `sort` → `limit` → `output` producing SQLite SQL with bound parameters.

## See also

- [sql.md](../../docs/features/sql.md)
- [collection-transforms.md](../../imp-spec/docs/packages/imp-collection-transforms/collection-transforms.md)
- [pathing.md](../../imp-spec/docs/packages/imp-pathing/pathing.md)
- Root [AGENTS.md](../../AGENTS.md)
