# Node libraries

## Summary

Declarative **catalogs of node types** that library packages can ship without depending on a registry. Types live in `imp-spec`; loading/lookup lives in `imp-registry`.

## When to read this

- Defining or changing `NodeType` or `NodeLibrary`
- Authoring a package that exports a library of Imp node types
- Regenerating library interfaces in `imp-spec`

## Requirements

### NodeType

| Field | Type | Required |
| --- | --- | --- |
| `id` | `NodeTypeId` | must |
| `inputs` | `Ports` | must (may be empty) |
| `outputs` | `Ports` | must (may be empty) |

A **catalog entry** for a node type: port templates keyed by the same `NodeTypeId` used on graph `Node.type`. Informal “node definition” in prose maps to `NodeType`.

A type’s `id` must equal its key in the parent `NodeLibrary.types` map when the library is well-formed. Port map key / `Port.id` equality matches [graph-model.md](./graph-model.md).

### NodeLibrary

| Field | Type | Required |
| --- | --- | --- |
| `id` | `string` | must |
| `types` | map `NodeTypeId` → `NodeType` | must (may be empty) |

A named, declarative collection of `NodeType`s. Libraries **must not** require `imp-registry`; they implement this interface from `imp-spec` alone.

A library does not execute nodes. Executable bindings to types, if added later, may stay separate.

### TypeScript binding (illustrative)

```ts
interface NodeType {
  id: NodeTypeId
  inputs: Ports
  outputs: Ports
}

interface NodeLibrary {
  id: string
  types: Record<NodeTypeId, NodeType>
}
```

## Design rationale

- **`Node` stays the graph instance**; **`NodeType` is the catalog** so instance vs type naming stays clear (`Node.type` ↔ `NodeType.id`).
- Library packages depend only on **`imp-spec`**, so they can be published and composed without pulling registry machinery.
- Catalogs are **data shapes** (plain objects), not classes with behavior.

## Behavior / pipeline

This feature is a **data shape** only. Loading and conflict policy are documented in [registry.md](./registry.md).

## Inputs / outputs / artifacts

| Artifact | Role |
| --- | --- |
| This doc | Authoritative library model spec |
| `packages/imp-spec/src/library.ts` | TypeScript interfaces regenerated from this doc |

## Quick start

```ts
import type { NodeLibrary } from "imp-spec"

const math: NodeLibrary = {
  id: "example.math",
  types: {
    add: {
      id: "add",
      inputs: {
        a: { id: "a", type: { id: "number" } },
        b: { id: "b", type: { id: "number" } },
      },
      outputs: {
        sum: { id: "sum", type: { id: "number" } },
      },
    },
  },
}
```

## Configuration

None.

## Verification

- `bun run typecheck` from the repo root (or `packages/imp-spec`) must succeed.
- Types in `imp-spec` must match the field tables above.

## Implementation pointers

- Package: [`packages/imp-spec`](../../packages/imp-spec/)
- Agent notes: [`packages/imp-spec/AGENTS.md`](../../packages/imp-spec/AGENTS.md)
- Registry: [registry.md](./registry.md)

## See also

- [graph-model.md](./graph-model.md)
- [registry.md](./registry.md)
- Root [AGENTS.md](../../AGENTS.md)
