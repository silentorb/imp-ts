# Packages

Language-neutral specs: [`../imp-spec/docs/packages/`](../imp-spec/docs/packages/). Imp Translator and runtime specs: [`../docs/features/`](../docs/features/).

| Package | Role |
| --- | --- |
| [`imp-core-types`](./imp-core-types/) | Core graph + library type interfaces; `coreNodeLibrary` |
| [`imp-registry`](./imp-registry/) | Load `NodeLibrary` / `GraphTypeLibrary` values and look up types |
| [`imp-typecheck`](./imp-typecheck/) | Static signal-type checking for graphs |
| [`imp-graph-resolve`](./imp-graph-resolve/) | Late nested graph resolution |
| [`imp-react-flow`](./imp-react-flow/) | **Imp Translator** — Imp ↔ React Flow |
| [`imp-collection-transforms`](./imp-collection-transforms/) | Collection combinator `NodeLibrary` |
| [`imp-pathing`](./imp-pathing/) | GQL-like path operator `NodeLibrary` |
| [`imp-sql`](./imp-sql/) | **Imp Translator** — Imp → SQL |
| [`imp-execution`](./imp-execution/) | Runtime consumer (in-place execution) |

```mermaid
flowchart TB
  SPEC[imp-core-types]

  subgraph libraries [Libraries]
    REG[imp-registry]
    CT[imp-collection-transforms]
    PATH[imp-pathing]
  end

  REG --> SPEC
  CT --> SPEC
  PATH --> SPEC

  subgraph impTs [Translators and runtime]
    RF[imp-react-flow]
    SQL[imp-sql]
    EXEC[imp-execution]
  end

  RF --> SPEC
  SQL --> SPEC
  SQL --> REG
  SQL --> CT
  SQL --> PATH
  EXEC --> SPEC
  EXEC --> REG
  EXEC --> CT
  EXEC --> PATH
```

Each package should have a `README.md` (human context) and `AGENTS.md` (how to work in the package).
