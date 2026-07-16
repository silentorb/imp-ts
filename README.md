# imp-ts

**Imp** is a universal transmission format for directed acyclic graphs (DAGs).

This repository is the TypeScript implementation of Imp (GitHub: [`silentorb/imp-ts`](https://github.com/silentorb/imp-ts)). Beyond this surface name, the project refers to itself as **Imp**.

## What Imp is

Imp defines a portable graph data model: nodes with typed ports, edges that connect ports, and a graph record keyed by ids. Packages in this repo are mostly specifications and converters/translators between Imp and other graph representations.

Imp is the successor to [imp-kotlin](https://github.com/silentorb/imp-kotlin), narrowed to the **graph data layer** only (no text/code language layer).

## Packages

| Package | Role |
| --- | --- |
| [`imp-spec`](./packages/imp-spec/) | Core graph types and language-agnostic model specs |

## Development

Requires [Bun](https://bun.sh/). From the repo root:

```bash
bun install
bun run typecheck
```

In **silentorb-workbench**, this repo mounts at `/workspaces/imp` (host default `~/dev/imp`, or `IMP_REPO`).

## Agent docs

Authoritative design specs live under [`docs/`](./docs/). Start with [`AGENTS.md`](./AGENTS.md).

## License

[MIT](./LICENSE)
