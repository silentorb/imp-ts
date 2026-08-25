# Collection transforms

## Summary

A **`NodeLibrary`** of common functional collection combinators (`filter`, `sort`, `limit`, …) and predicate/scalar helpers. Ships as `packages/imp-collection-transforms`. Catalog only — no execution. SQL lowering lives in [sql.md](./sql.md).

## When to read this

- Adding or changing collection transform / predicate node types
- Authoring Imp graphs that transform collections for SQL or other backends
- Implementing or regenerating `imp-collection-transforms`

## Requirements

### Library identity

| Field | Value |
| --- | --- |
| Package | `imp-collection-transforms` |
| Library `id` | `imp.collection.transforms` |
| Depends on | `imp-spec` only (not `imp-registry`) |

### Naming

Use **full words** for `NodeTypeId`s unless the abbreviation is a widely understood term (`filter`, `sort`, `limit` are fine; use `equals` / `not_equals` / `less_than` / `greater_than`, not `eq` / `neq` / `lt` / `gt`).

### Signal type ids (v1)

| Id | Role |
| --- | --- |
| `collection` | Ordered/unordered row set flowing through transforms |
| `boolean` | Predicate results |
| `string` | Column names, sort direction, projected column lists |
| `number` | Limits, offsets, numeric literals |
| `any` | Generic scalar / literal payload |

### No table source node

There is **no** `from` / table-source node. The incoming collection arrives via a core boundary **`input`** node (`imp.core` from `imp-spec`). The host wires the upstream collection; the subgraph is a collection → collection function.

### Node types

#### Transforms

| NodeType | Inputs | Outputs | Notes |
| --- | --- | --- | --- |
| `filter` | `collection` (`collection`), `predicate` (`boolean`) | `collection` | Keep rows where predicate is true |
| `except` | `collection` (`collection`), `exclude` (`collection`) | `collection` | Keep rows from `collection` whose `id` does not appear in `exclude` (set difference by identity) |
| `sort` | `collection` (`collection`), `column` (`string`), `direction` (`string`, default `"asc"`) | `collection` | `direction` is `"asc"` or `"desc"` |
| `limit` | `collection` (`collection`), `count` (`number`) | `collection` | Take first `count` rows |
| `offset` | `collection` (`collection`), `count` (`number`) | `collection` | Skip first `count` rows |
| `project` | `collection` (`collection`), `columns` (`string`) | `collection` | `columns` is a comma-separated column name list (v1) |
| `group` | `collection` (`collection`), `column` (`string`), `direction` (`string`, default `"asc"`) | `collection` | Partition rows by `column`; `direction` is `"asc"` or `"desc"`. Rows stay flat; hosts use group order for bands/sections. SQL lowering is `ORDER BY` on the group column; partition and enum-weight sort happen after execute. |
| `search` | `collection` (`collection`), `query` (`string`) | `collection` | Declarative text retrieval. Imp defines intent only — ranking, field coverage, fuzzy matching, case rules, empty-query behavior, and preview metadata are **host-defined**. Generic `imp-sql` does **not** lower `search`; hosts intercept at compile or execute (see [sql.md](./sql.md)). |

`except` is **declarative** only. Lowerers must resolve it lazily (e.g. SQL anti-membership over a subquery). They must **not** materialize `exclude` into an in-memory id set and subtract.

#### Predicates

| NodeType | Inputs | Outputs |
| --- | --- | --- |
| `contains` | `haystack` (`any`), `needle` (`string`) | `value` (`boolean`) | Precise substring match when both operands coerce to strings; adapters define case rules. **Not** a declarative search — use `search` for open-ended retrieval. |
| `equals` | `left` (`any`), `right` (`any`) | `value` (`boolean`) |
| `not_equals` | `left` (`any`), `right` (`any`) | `value` (`boolean`) |
| `less_than` | `left` (`any`), `right` (`any`) | `value` (`boolean`) |
| `greater_than` | `left` (`any`), `right` (`any`) | `value` (`boolean`) |
| `and` | `left` (`boolean`), `right` (`boolean`) | `value` (`boolean`) |
| `or` | `left` (`boolean`), `right` (`boolean`) | `value` (`boolean`) |
| `not` | `value` (`boolean`) | `value` (`boolean`) |

#### Scalars

| NodeType | Inputs | Outputs | Notes |
| --- | --- | --- | --- |
| `column` | `name` (`string`) | `value` (`any`) | Column reference by name |
| `literal` | `value` (`any`) | `value` (`any`) | Instance literal on `inputs.value`; passthrough out |

### TypeScript binding (illustrative)

```ts
import type { NodeLibrary } from "imp-spec"

export const collectionTransformsLibrary: NodeLibrary
```

## Design rationale

- Combinators are declarative catalog data so editors and lowerers share one vocabulary.
- Host-provided collections (via core `input`) match Tome’s “collection → collection” integration without baking table names into Imp.
- Full-word type ids keep graphs readable in UI and docs.

## Behavior / pipeline

This package ships **data only**. Compose with `imp-registry` (`loadLibrary`) and lower with `imp-sql` ([sql.md](./sql.md)).

Typical pipeline:

1. Core `input` (collection) → `filter` / `except` / `sort` / `group` / `limit` / … → core `output`.
2. Predicates and scalars attach as subgraphs into `filter.predicate` (and similar).
3. `except.exclude` is a second collection-producing subgraph (often sharing the same `input`, e.g. via `traverse`).

## Inputs / outputs / artifacts

| Artifact | Role |
| --- | --- |
| This doc | Catalog source of truth |
| `packages/imp-collection-transforms` | `collectionTransformsLibrary` + tests |

## Quick start

```ts
import { collectionTransformsLibrary } from "imp-collection-transforms"
import { coreNodeLibrary } from "imp-spec"
import { createRegistry, loadLibrary } from "imp-registry"

const registry = loadLibrary(
  loadLibrary(createRegistry(), coreNodeLibrary),
  collectionTransformsLibrary,
)
```

## Configuration

None.

## Verification

- `bun run typecheck` and `bun test` from the repo root (or this package) must succeed.
- Tests cover library shape and successful `imp-registry` load.

## Implementation pointers

- Package: [`packages/imp-collection-transforms`](../../packages/imp-collection-transforms/)
- Core boundary nodes: [graph-model.md](./graph-model.md)
- SQL lowering: [sql.md](./sql.md)

## See also

- [graph-model.md](./graph-model.md)
- [node-libraries.md](./node-libraries.md)
- [sql.md](./sql.md)
- Root [AGENTS.md](../../AGENTS.md)
