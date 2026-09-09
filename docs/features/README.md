# Imp Translator and runtime specs

Implementation-specific specs for packages that translate Imp graphs to other formats or execute them in place. Language-neutral specs live in **[imp-spec](https://github.com/silentorb/imp-spec)**.

## Registered features

| Package | Role | Spec |
| --- | --- | --- |
| `imp-sql` | **Imp Translator** — Imp → SQL | [sql.md](./sql.md) |
| `imp-react-flow` | **Imp Translator** — Imp ↔ React Flow | [react-flow.md](./react-flow.md) |
| `imp-execution` | **Runtime consumer** — in-place graph execution | [execution.md](./execution.md) |

## Split of concerns

- **imp-spec** ([`docs/packages/`](https://github.com/silentorb/imp-spec/tree/main/docs/packages/)) — graph IR, NodeLibrary catalogs, registry, typecheck, graph-resolve.
- **imp-ts `docs/features/`** (here) — Imp Translators and runtime packages.
- **Package `AGENTS.md`** — how to work in the TypeScript implementation.

See [../README.md](../README.md) and root [AGENTS.md](../../AGENTS.md).
