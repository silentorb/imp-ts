# imp-ts

**Imp** is a universal transmission format for directed acyclic graphs (DAGs).

This repository is the TypeScript implementation of Imp (GitHub: [`silentorb/imp-ts`](https://github.com/silentorb/imp-ts)). Beyond this surface name, the project refers to itself as **Imp**.

## What Imp is

Imp defines a portable graph data model: nodes with typed ports, edges that connect ports, and a graph record keyed by ids. Packages in this repo are mostly specifications and converters/translators between Imp and other graph representations.

Imp is the successor to [imp-kotlin](https://github.com/silentorb/imp-kotlin), narrowed to the **graph data layer** only (no text/code language layer).

## Packages

See [`packages/README.md`](./packages/README.md) for the package list and dependency diagram.

## Development

Requires [Bun](https://bun.sh/). From the repo root:

```bash
bun install
bun run typecheck
bun test
```

In **silentorb-workbench**, this repo mounts at `.mnt/imp-ts/` (container path: `/workspaces/silentorb-workbench/.mnt/imp-ts`; host default `../imp-ts`, or `IMP_REPO`).

## Agent docs

Authoritative **language-neutral specs** live in sibling repo [`imp-spec`](../imp-spec/) (`.mnt/imp-spec/` in workbench). This repo's [`AGENTS.md`](./AGENTS.md) covers the TypeScript binding; package `AGENTS.md` files cover implementation details.

## License

[MIT](./LICENSE)
