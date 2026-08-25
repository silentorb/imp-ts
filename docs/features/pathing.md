# Pathing

## Summary

A **`NodeLibrary`** of GQL-like graph path operators (`traverse`, …) over a host-supplied node collection and edges relation. Ships as `packages/imp-pathing`. Catalog only — no execution. SQL lowering lives in [sql.md](./sql.md).

## When to read this

- Adding or changing path / hop node types
- Authoring Imp graphs that walk host graph edges for SQL or other backends
- Implementing or regenerating `imp-pathing`

## Requirements

### Library identity

| Field | Value |
| --- | --- |
| Package | `imp-pathing` |
| Library `id` | `imp.pathing` |
| Depends on | `imp-spec` only (not `imp-registry`) |

### Naming

Use **full words** for `NodeTypeId`s unless the abbreviation is a widely understood term (`traverse` is fine).

### Signal type ids (v1)

| Id | Role |
| --- | --- |
| `collection` | Ordered/unordered row set (typically host nodes) flowing through path ops and collection transforms |
| `string` | Association ids and other string literals |
| `number` | Direction and other numeric literals |

Reuse the same signal ids as [collection-transforms.md](./collection-transforms.md) so path results compose with `filter` / `sort` / `project`.

### No table source node

There is **no** `from` / table-source node. The incoming node collection arrives via a core boundary **`input`** node or upstream transforms. Edge storage is host-defined at lower time (see [sql.md](./sql.md) `RelationalSchema.edges`).

### Node types

| NodeType | Inputs | Outputs | Notes |
| --- | --- | --- | --- |
| `traverse` | `collection` (`collection`), `association` (`string`), `direction` (`number`, default `0`), `edge_property` (`string`, default `null`), `edge_equals` (`any`, default `null`) | `collection` | One hop: for each source row identity (`id`), follow host edges where `source = id` and `type = hostEdgeType(association, direction)`, emit distinct target nodes as the new collection. When the host edges relation has a JSON `propertiesColumn`, overlay hop-edge properties onto each target’s `properties` so downstream `project` / `group` can read them. When both `edge_property` and `edge_equals` are non-null, also require the hop edge’s JSON property named by `edge_property` to equal `edge_equals`. Hosts may map `edge_equals` through `RelationalSchema.encodePropertyLiteral` at SQL compile time (e.g. enum labels → cache indices). |

- Chained hops = multiple `traverse` nodes in the Imp DAG (not recursive / variable-length paths in v1).
- `association` and `direction` are **separate** Imp values. Graphs must not pack them into one delimited string.
- `direction` is `0` or `1` (endpoint index on a two-ended association).
- Hosts map `(association, direction)` onto their edges `type` column via `RelationalSchema.edgeType` (default: use `association` alone).
- Optional edge property filter requires `RelationalEdgesSchema.propertiesColumn` at SQL lower time; `edge_property` must be a simple identifier when set.
- If exactly one of `edge_property` / `edge_equals` is non-null, lowering **must** throw.
- Result remains a **node collection**, so collection transforms keep working.

### TypeScript binding (illustrative)

```ts
import type { NodeLibrary } from "imp-spec"

export const pathingLibrary: NodeLibrary
```

## Design rationale

- Path operators are declarative catalog data so editors and lowerers share one vocabulary.
- Keeping the catalog SQL-free lets other backends interpret the same graphs.
- Explicit `association` + `direction` ports keep Imp graphs readable without host-specific string tokenization; hosts may still encode a packed type string at the SQL boundary if their storage requires it.

## Behavior / pipeline

This package ships **data only**. Compose with `imp-registry` (`loadLibrary`) and lower with `imp-sql` ([sql.md](./sql.md)).

Typical pipeline:

1. Core `input` (node collection) → `traverse` → `filter` / `project` → core `output`.
2. Multiple `traverse` nodes chain single hops.

## Inputs / outputs / artifacts

| Artifact | Role |
| --- | --- |
| This doc | Catalog source of truth |
| `packages/imp-pathing` | `pathingLibrary` + tests |

## Quick start

```ts
import { pathingLibrary } from "imp-pathing"
import { collectionTransformsLibrary } from "imp-collection-transforms"
import { coreNodeLibrary } from "imp-spec"
import { createRegistry, loadLibrary } from "imp-registry"

const registry = loadLibrary(
  loadLibrary(
    loadLibrary(createRegistry(), coreNodeLibrary),
    collectionTransformsLibrary,
  ),
  pathingLibrary,
)
```

## Configuration

None.

## Verification

- `bun run typecheck` and `bun test` from the repo root (or this package) must succeed.
- Tests cover library shape and successful `imp-registry` load.

## Implementation pointers

- Package: [`packages/imp-pathing`](../../packages/imp-pathing/)
- Core boundary nodes: [graph-model.md](./graph-model.md)
- Collection transforms: [collection-transforms.md](./collection-transforms.md)
- SQL lowering: [sql.md](./sql.md)

## See also

- [collection-transforms.md](./collection-transforms.md)
- [graph-model.md](./graph-model.md)
- [node-libraries.md](./node-libraries.md)
- [sql.md](./sql.md)
- Root [AGENTS.md](../../AGENTS.md)
