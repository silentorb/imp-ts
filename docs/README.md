# Documentation

Everything under `./docs` is **primarily for AI agents** — stable, high-level knowledge so agents need not re-analyze the repo for basics on every task. Docs should remain easy for humans to read and edit.

## Specs → code (not the reverse)

Feature docs describe the **data model and behavior** in language-agnostic terms. They are authored and maintained.

**Code type interfaces** (e.g. in `packages/imp-spec`) must be regenerable from those specs. An agent should be able to emit unambiguous TypeScript interfaces from a feature doc alone — and, in principle, equivalent interfaces for other languages (Python, Rust, etc.). Do **not** treat docs as disposable output of the code.

## Layout

| Path | Role |
| --- | --- |
| [`features/`](./features/) | Authoritative project-feature specs (one file per capability) |

Start at [`features/README.md`](./features/README.md) for the registry and template.
