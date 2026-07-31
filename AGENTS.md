# AGENTS Guide — Imp

## Repository purpose

**Imp** is a universal transmission format for directed acyclic graphs (DAGs). This repo is the TypeScript home of Imp (GitHub surface name **imp-ts** / [`silentorb/imp-ts`](https://github.com/silentorb/imp-ts)). In packages, docs, and imports, use the name **Imp** — not `imp-ts`.

Imp succeeds [imp-kotlin](https://github.com/silentorb/imp-kotlin) but keeps only the **graph data layer** (no text/code language layer). Packages are mostly specs and converters/translators between Imp and other graph representations.

| Package | Role |
| --- | --- |
| `packages/imp-spec/` | Core graph + library TypeScript interfaces; core boundary `NodeLibrary` |
| `packages/imp-registry/` | Load `NodeLibrary` values and look up `NodeType`s |
| `packages/imp-react-flow/` | Imp ↔ React Flow converters |
| `packages/imp-collection-transforms/` | Collection combinator `NodeLibrary` |
| `packages/imp-pathing/` | GQL-like path operator `NodeLibrary` |
| `packages/imp-sql/` | Imp collection graphs → SQL via Kysely |

Each package has a brief **`README.md`** (context) and **`AGENTS.md`** (how to work in the package). See [`packages/README.md`](./packages/README.md).

## Specs vs code (regen rule)

Imp is **agent-spec driven**. Treat feature docs as the source of truth for the data model.

| Layer | What | Regenerated? |
| --- | --- | --- |
| Specs | `docs/features/` (and package narrative) | **No** — authored and maintained |
| Code interfaces | `packages/*/src` TypeScript types | **Yes** — regenerable from the matching feature doc |

Specs must be language-neutral enough that an agent could emit equivalent interfaces in other languages (e.g. Python, Rust) without redesigning the model. This repo ships the TypeScript binding only.

When docs and code disagree, update the doc or the code explicitly — do not leave them divergent.

## Project context

- Run from repo root: `bun install`, `bun run typecheck`.
- Feature specs: [`docs/features/`](./docs/features/) — **read only the doc matching your task**.
- Package notes: each package's `README.md` and `AGENTS.md`.

## Feature documentation

| If your task involves… | Read |
| --- | --- |
| Core graph model (`Graph`, `Node`, `Edge`, ports, `InputValues`) | [`docs/features/graph-model.md`](./docs/features/graph-model.md) |
| Node type libraries (`NodeType`, `NodeLibrary`) | [`docs/features/node-libraries.md`](./docs/features/node-libraries.md) |
| Registry load / lookup | [`docs/features/registry.md`](./docs/features/registry.md) |
| React Flow integration / converters | [`docs/features/react-flow.md`](./docs/features/react-flow.md) |
| Collection transform combinators | [`docs/features/collection-transforms.md`](./docs/features/collection-transforms.md) |
| Path / hop operators | [`docs/features/pathing.md`](./docs/features/pathing.md) |
| Imp → SQL (Kysely) | [`docs/features/sql.md`](./docs/features/sql.md) |

See [`docs/features/README.md`](./docs/features/README.md) for the feature-doc template.

## Working conventions

- Focused changes only; avoid unrelated refactors.
- **Prototypal stage — no backwards compatibility.** Delete old shapes; migrate consumers in the same change.
- Package and import names use `imp-*` (never `imp-ts-*`).
- Prefer Bun for tooling and tests.

## Workbench integration

In **silentorb-workbench**, this repo mounts at `/workspaces/imp` (host default `~/dev/imp`, or `IMP_REPO`).
