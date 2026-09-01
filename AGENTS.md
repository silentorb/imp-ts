# AGENTS Guide — Imp (TypeScript binding)

## Repository purpose

**Imp** is a universal transmission format for directed acyclic graphs (DAGs). This repo is the **TypeScript binding** (GitHub: [`silentorb/imp-ts`](https://github.com/silentorb/imp-ts)). In packages, docs, and imports, use the name **Imp** — not `imp-ts`.

Language-neutral specs live in sibling repo **[imp-spec](../imp-spec/)** — read those for data model and behavior; this repo implements them.

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
| Language-neutral specs | [`../imp-spec/docs/packages/`](../imp-spec/docs/packages/) | **No** — authored in imp-spec |
| TypeScript interfaces / implementation | `packages/*/src` | **Yes** — implement or regenerate from imp-spec |

When specs and code disagree, update imp-spec or the code explicitly.

## Project context

- Run from repo root: `bun install`, `bun run typecheck`, `bun test` (test runs typecheck first; treat typecheck failures as blocking).
- Package notes: each package's `README.md` and `AGENTS.md`.

## Feature documentation

### Language-neutral (imp-spec)

| If your task involves… | Read |
| --- | --- |
| Core graph model | [`imp-spec` graph-model](../imp-spec/docs/packages/imp-core-types/graph-model.md) |
| Node type libraries | [`imp-spec` node-libraries](../imp-spec/docs/packages/imp-core-types/node-libraries.md) |
| Graph libraries | [`imp-spec` graph-libraries](../imp-spec/docs/packages/imp-core-types/graph-libraries.md) |
| Graph resolution | [`imp-spec` resolve](../imp-spec/docs/packages/imp-graph-resolve/resolve.md) |
| Static type checking | [`imp-spec` type-system](../imp-spec/docs/packages/imp-typecheck/type-system.md) |
| Registry | [`imp-spec` registry](../imp-spec/docs/packages/imp-registry/registry.md) |
| Collection transforms | [`imp-spec` collection-transforms](../imp-spec/docs/packages/imp-collection-transforms/collection-transforms.md) |
| Pathing | [`imp-spec` pathing](../imp-spec/docs/packages/imp-pathing/pathing.md) |

Cross-package overview: [`../imp-spec/docs/overview/`](../imp-spec/docs/overview/).

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

**Agent flow:** review the settled diff, classify each touched package (`minor` or `patch`), then run `bash scripts/bump-version.sh <package> <level>` from **silentorb-workbench** (or the thin delegator in this repo: `bun scripts/bump-version.ts`). The script scans imp-ts and tome packages, cascades on `minor`, and can refresh both lockfiles with `--install`. Reconcile bump levels at commit time — see workbench [`plan-commit-workflow.mdc`](../../.cursor/rules/plan-commit-workflow.mdc).

Bump levels and lockfile refresh are reconciled at commit time — see workbench [`plan-commit-workflow.mdc`](../../.cursor/rules/plan-commit-workflow.mdc).

## Workbench integration

In **silentorb-workbench**, this repo mounts at `.mnt/imp-ts/` (container path: `/workspaces/silentorb-workbench/.mnt/imp-ts`; host default `../imp-ts`, or `IMP_REPO`). Specs: `.mnt/imp-spec/`.
