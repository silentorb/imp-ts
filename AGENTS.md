# AGENTS Guide — Imp (TypeScript implementation)

## Repository purpose

**Imp** is a universal transmission format for directed acyclic graphs (DAGs). This repo is the **TypeScript implementation** (GitHub: [`silentorb/imp-ts`](https://github.com/silentorb/imp-ts)). In packages, docs, and imports, use the name **Imp** — not `imp-ts`.

Language-neutral specs live in **[imp-spec](https://github.com/silentorb/imp-spec)** — read those for data model and behavior; this repo implements them.

| Package | Role |
| --- | --- |
| `packages/imp-core-types/` | Core graph + library TypeScript interfaces; core boundary `NodeLibrary` |
| `packages/imp-registry/` | Load `NodeLibrary` / `GraphTypeLibrary` values and look up types |
| `packages/imp-typecheck/` | Static signal-type checking for graphs |
| `packages/imp-react-flow/` | **Imp Translator** — Imp ↔ React Flow |
| `packages/imp-collection-transforms/` | Collection combinator `NodeLibrary` |
| `packages/imp-pathing/` | GQL-like path operator `NodeLibrary` |
| `packages/imp-sql/` | **Imp Translator** — Imp → SQL via Kysely |
| `packages/imp-execution/` | Runtime consumer for collection/path graphs (read-only host) |

Each package has **`README.md`** (context) and **`AGENTS.md`** (how to work in the package). See [`packages/README.md`](./packages/README.md).

## Specs vs code

| Layer | Location | Regenerated? |
| --- | --- | --- |
| Language-neutral specs | [imp-spec `docs/packages/`](https://github.com/silentorb/imp-spec/tree/main/docs/packages/) | **No** — authored in imp-spec |
| TypeScript interfaces / implementation | `packages/*/src` | **Yes** — implement or regenerate from imp-spec |

When specs and code disagree, update imp-spec or the code explicitly.

## Project context

- Run from repo root: `bun install`, `bun run typecheck`, `bun test` (test runs typecheck first; treat typecheck failures as blocking).
- Package notes: each package's `README.md` and `AGENTS.md`.

## Feature documentation

### Language-neutral (imp-spec)

| If your task involves… | Read |
| --- | --- |
| Core graph model | [`imp-spec` graph-model](https://github.com/silentorb/imp-spec/blob/main/docs/packages/imp-core-types/graph-model.md) |
| Node type libraries | [`imp-spec` node-libraries](https://github.com/silentorb/imp-spec/blob/main/docs/packages/imp-core-types/node-libraries.md) |
| Graph libraries | [`imp-spec` graph-libraries](https://github.com/silentorb/imp-spec/blob/main/docs/packages/imp-core-types/graph-libraries.md) |
| Graph resolution | [`imp-spec` resolve](https://github.com/silentorb/imp-spec/blob/main/docs/packages/imp-graph-resolve/resolve.md) |
| Static type checking | [`imp-spec` type-system](https://github.com/silentorb/imp-spec/blob/main/docs/packages/imp-typecheck/type-system.md) |
| Registry | [`imp-spec` registry](https://github.com/silentorb/imp-spec/blob/main/docs/packages/imp-registry/registry.md) |
| Collection transforms | [`imp-spec` collection-transforms](https://github.com/silentorb/imp-spec/blob/main/docs/packages/imp-collection-transforms/collection-transforms.md) |
| Pathing | [`imp-spec` pathing](https://github.com/silentorb/imp-spec/blob/main/docs/packages/imp-pathing/pathing.md) |

Cross-package overview: [imp-spec `docs/overview/`](https://github.com/silentorb/imp-spec/tree/main/docs/overview/).

### Imp Translators and runtime (this repo)

| If your task involves… | Read |
| --- | --- |
| Imp → SQL translation | [sql.md](./docs/features/sql.md) |
| Imp ↔ React Flow | [react-flow.md](./docs/features/react-flow.md) |
| Dynamic execution | [execution.md](./docs/features/execution.md) |

## Working conventions

- Focused changes only; avoid unrelated refactors.
- **Prototypal stage — no backwards compatibility.** Delete old shapes; migrate consumers in the same change.
- Package and import names use `imp-*` (never `imp-ts-*`).
- TypeScript-to-TypeScript imports are extensionless (no `.ts` suffix).
- Prefer Bun for tooling and tests.

## Versioning

Packages use **0.x semver** (`0.MINOR.PATCH`). While `MAJOR` is 0, treat **`MINOR` as the API epoch** — bump it (reset `PATCH`) for breaking changes or new functionality; bump `PATCH` for backwards-compatible fixes only.

Internal workspace dependencies use caret-locked ranges: `"imp-core-types": "workspace:^0.2.0"`. When a dependency's `MINOR` epoch changes, direct dependents must bump their `MINOR` too and update the range.

**Agent flow:** on **bump** / **commit and bump**, review commits since the last tome `v*` tag, classify each touched package (`minor` or `patch`), then run `bun scripts/bump-version.ts <package> <level>` from this repo. Reconcile bump levels at **bump** time — not on plain **commit**.
