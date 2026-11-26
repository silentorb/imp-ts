# imp-file — agent notes

## What it is

Structural parsing and serialization of Imp files, plus conversions to and from graph sources / in-memory `Graph`s. Semantic checks (types, bindings vs declared ports) live in `imp-typecheck`; loading types and definitions lives in `imp-registry` (`loadImpFile`).

## Specs vs code

| Layer | Location | Regenerated? |
| --- | --- | --- |
| Language-neutral spec | [`imp-spec` imp-files](https://github.com/silentorb/imp-spec/blob/main/docs/packages/imp-file/imp-files.md) | No |
| Interfaces | `ImpFile`, `ImpFileEdge` in [`imp-core-types`](../imp-core-types/) | Implement to match spec |
| Implementation | `src/*.ts` | Implement to match spec |

## Layout

| Path | Contents |
| --- | --- |
| `src/parse.ts` | `parseImpFileJson`, `parseImpFile`, `ImpFileParseError` (structural validation) |
| `src/file.ts` | `serializeImpFile`, `impFileGraph`, `impFileGraphSource`, `impFileFromGraph`, `assertImpFileSections` |
| `src/*.test.ts` | Parse, validation errors, serialization order, graph conversions |

## Conventions

- Sections are arrays; never reorder elements when serializing.
- Keep Rust `imp_file` (imp-rs) in step with this package.
