# Registry

## Summary

**`imp-registry`** loads `NodeLibrary` values and provides lookup of `NodeType`s by `NodeTypeId`. Callers pass library objects they already have — no I/O or dynamic import in v1.

## When to read this

- Implementing or changing registry load/lookup behavior
- Deciding how apps compose multiple type libraries
- Using `packages/imp-registry`

## Requirements

### API

| Operation | Behavior |
| --- | --- |
| `createRegistry()` | Returns an empty registry |
| `loadLibrary(registry, library)` | Returns a **new** registry with the library’s types merged in (immutable) |
| `getNodeType(registry, typeId)` | Returns the registered `NodeType` or `undefined` |
| `listNodeTypes(registry)` | Returns all registered `NodeType`s |
| `listLibraries(registry)` | Returns the libraries that were loaded (in load order) |

### Conflict policy

Loading a `NodeType` whose `NodeTypeId` is **already registered** **must throw**. No silent overwrite.

### Non-goals (v1)

- Filesystem or URL loading
- Dynamic `import()` / plugin discovery
- Executable / runtime bindings for types

### TypeScript binding (illustrative)

```ts
createRegistry(): Registry
loadLibrary(registry: Registry, library: NodeLibrary): Registry
getNodeType(registry: Registry, typeId: NodeTypeId): NodeType | undefined
listNodeTypes(registry: Registry): NodeType[]
listLibraries(registry: Registry): readonly NodeLibrary[]
```

`Registry` is a plain/opaque value operated on by functions (not a class hierarchy). Library shapes come from `imp-spec` ([node-libraries.md](./node-libraries.md)).

## Design rationale

- Registry depends on **`imp-spec` library interfaces**; library packages do **not** depend on the registry.
- Immutable `loadLibrary` keeps composition and tests simple.
- Explicit conflicts avoid accidental type-id collisions across libraries.

## Behavior / pipeline

1. Start from `createRegistry()`.
2. `loadLibrary` for each `NodeLibrary` (throws on duplicate `NodeTypeId`).
3. Resolve graph `Node.type` values via `getNodeType`.

## Inputs / outputs / artifacts

| Artifact | Role |
| --- | --- |
| This doc | Registry behavior source of truth |
| `packages/imp-registry` | Implementation + tests |
| [node-libraries.md](./node-libraries.md) | `NodeType` / `NodeLibrary` shapes |

## Quick start

```ts
import type { NodeLibrary } from "imp-spec"
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

## Configuration

None.

## Verification

- `bun run typecheck` and `bun test` from the repo root (or `packages/imp-registry`) must succeed.
- Tests cover empty registry, successful load/lookup, and conflict on duplicate `NodeTypeId`.

## Implementation pointers

- Package: [`packages/imp-registry`](../../packages/imp-registry/)
- Agent notes: [`packages/imp-registry/AGENTS.md`](../../packages/imp-registry/AGENTS.md)

## See also

- [node-libraries.md](./node-libraries.md)
- [graph-model.md](./graph-model.md)
- Root [AGENTS.md](../../AGENTS.md)
