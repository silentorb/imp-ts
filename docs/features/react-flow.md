# Imp ↔ React Flow

## Summary

Imp ↔ React Flow conversion and the editable Precise canvas live in the sibling package **[`imp-graph-view`](https://github.com/silentorb/imp-graph-view)** (not in this repo).

The former `imp-react-flow` package in this repository has been **removed**. Hosts that need converters or `ImpGraphView` should depend on `imp-graph-view`.

## When to read this

- Looking for Imp ↔ React Flow translators formerly under `packages/imp-react-flow/`
- Wiring a host canvas (Tome uses `tome-imp-view` → `imp-graph-view`)

## Requirements

- Imp `Graph` remains free of layout fields
- Converters inject `{0,0}` positions into React Flow nodes and drop positions when converting back
- Hosts supply a separate `layout` map to `ImpGraphView`

## See also

- [`imp-graph-view` AGENTS.md](https://github.com/silentorb/imp-graph-view/blob/main/AGENTS.md)
- Tome embed adapter: `tome-imp-view` in the tome monorepo
