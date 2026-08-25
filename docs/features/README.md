# Feature documentation

Each file in this directory is the **authoritative design spec** for one major Imp capability. A feature doc should:

1. **Streamline agent onboarding** — enough context without spelunking `packages/`.
2. **State design requirements** — explicit rules (shapes, invariants, formats). Prefer must / should / may language; requirements trump implementation when they diverge.
3. **Capture design rationale** — motivation and trade-offs.
4. **Support code regeneration** — describe the data model precisely enough that TypeScript (or other language) type interfaces can be regenerated from the doc alone. Specs are not regenerated from code.

## Registered features

| Feature | Doc |
| --- | --- |
| Core graph model | [graph-model.md](./graph-model.md) |
| Node libraries (`NodeType` / `NodeLibrary`) | [node-libraries.md](./node-libraries.md) |
| Registry (load / lookup type libraries) | [registry.md](./registry.md) |
| React Flow integration | [react-flow.md](./react-flow.md) |
| Collection transforms | [collection-transforms.md](./collection-transforms.md) |
| Pathing | [pathing.md](./pathing.md) |
| SQL lowering | [sql.md](./sql.md) |
| Dynamic execution (imp-execution) | [execution.md](./execution.md) |

## Split of concerns

- **Feature doc** (`docs/features/`) — *what* and *why* (requirements, rationale, regen-friendly model).
- **Package `AGENTS.md`** — *how to work in this package*.
- **Root `AGENTS.md`** — always-on router + repo-wide conventions; not a feature spec.

## Adding a new feature doc

1. Create `docs/features/<name>.md` using the template below.
2. Add a routing row to the **Feature documentation** table in root [`AGENTS.md`](../../AGENTS.md).
3. Add an entry to the table above.
4. Link from the package `AGENTS.md` if the feature has a `packages/` implementation.

## Feature doc template

```markdown
# <Feature name>

## Summary

## When to read this

## Requirements

## Design rationale

## Behavior / pipeline

## Inputs / outputs / artifacts

## Quick start

## Configuration

## Verification

## Implementation pointers

## See also
```
