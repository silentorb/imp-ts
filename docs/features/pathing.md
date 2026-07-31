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
| `string` | Edge type filters and other string literals |

Reuse the same signal ids as [collection-transforms.md](./collection-transforms.md) so path results compose with `filter` / `sort` / `project`.

### No table source node

There is **no** `from` / table-source node. The incoming node collection arrives via a core boundary **`input`** node or upstream transforms. Edge storage is host-defined at lower time (see [sql.md](./sql.md) `RelationalSchema.edges`).

### Node types

| NodeType | Inputs | Outputs | Notes |
| --- | --- | --- | --- |
| `traverse` | `collection` (`collection`), `edgeType` (`string`) | `collection` | One hop: for each source row identity (`id`), follow host edges where `source = id` and `type = edgeType`, emit distinct target nodes as the new collection |

- Chained hops = multiple `traverse` nodes in the Imp DAG (not recursive / variable-length paths in v1).
- `edgeType` is an opaque string at the Imp layer. Hosts map domain association labels onto edge type values.
- Result remains a **node collection**, so collection transforms keep working.

### TypeScript binding (illustrative)

```ts
import type { NodeLibrary } from "imp-spec"

export const pathingLibrary: NodeLibrary
```

## Design rationale

- Path operators are declarative catalog data so editors and lowerers share one vocabulary.
- Keeping the catalog SQL-free lets other backends interpret the same graphs.
- Opaque `edgeType` avoids baking domain association models into Imp.

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
