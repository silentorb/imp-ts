# Imp Translator and runtime specs

Binding-specific specs for packages that translate Imp graphs to other formats or execute them in place. Language-neutral specs live in sibling **[imp-spec](../../imp-spec/)**.

## Registered features

| Package | Role | Spec |
| --- | --- | --- |
| `imp-sql` | **Imp Translator** — Imp → SQL | [sql.md](./sql.md) |
| `imp-react-flow` | **Imp Translator** — Imp ↔ React Flow | [react-flow.md](./react-flow.md) |
| `imp-execution` | **Runtime consumer** — in-place graph execution | [execution.md](./execution.md) |

## Split of concerns

- **imp-spec** (`../imp-spec/docs/packages/`) — graph IR, NodeLibrary catalogs, registry, typecheck, graph-resolve.
- **imp-ts `docs/features/`** (here) — Imp Translators and runtime packages.
- **Package `AGENTS.md`** — how to work in the TypeScript binding.

See [../README.md](../README.md) and root [AGENTS.md](../../AGENTS.md).
