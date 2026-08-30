# Packages

Language-neutral specs: [`../imp-spec/docs/packages/`](../imp-spec/docs/packages/).

| Package | Role |
| --- | --- |
| [`imp-core-types`](./imp-core-types/) | Core graph + library type interfaces; `coreNodeLibrary` |
| [`imp-registry`](./imp-registry/) | Load `NodeLibrary` values and look up `NodeType`s |
| [`imp-react-flow`](./imp-react-flow/) | Imp ↔ React Flow converters |
| [`imp-collection-transforms`](./imp-collection-transforms/) | Collection combinator `NodeLibrary` |
| [`imp-pathing`](./imp-pathing/) | GQL-like path operator `NodeLibrary` |
| [`imp-sql`](./imp-sql/) | Imp → SQL via Kysely |
| [`imp-execution`](./imp-execution/) | Dynamic runtime for collection/path graphs (read-only host) |

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

  subgraph converters [Converters and runtimes]
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
