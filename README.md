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

## Agent docs

Authoritative **language-neutral specs** live in [`imp-spec`](https://github.com/silentorb/imp-spec). This repo's [`AGENTS.md`](./AGENTS.md) covers the TypeScript implementation; package `AGENTS.md` files cover implementation details.

## License

[MIT](./LICENSE)
