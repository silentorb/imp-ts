# React Flow integration

## Summary

**`imp-react-flow`** is an **Imp Translator** — bidirectional conversion between Imp `Graph` and React Flow `{ nodes, edges }`. Imp is the portable transmission model; React Flow is a UI/editor representation.

## When to read this

- Designing Imp ↔ React Flow mapping
- Changing Imp ports/edges in ways that affect handle identity

## Requirements

### Compatibility goals

Converters **must**:

1. Round-trip Imp `Graph` ↔ React Flow `{ nodes, edges }` without losing Imp topology (node ids, edge ids, `from`/`to` port references) or instance `InputValues`.
2. Map Imp port ids to React Flow **handle** ids (`sourceHandle` / `targetHandle`).
3. Map Imp edges (`from` / `to` as `PortReference`) to React Flow edges (`source` / `target` plus handle ids).
4. Require `sourceHandle` and `targetHandle` on every React Flow edge when converting RF→Imp (Imp fidelity — no single-port shortcut).

Converters **should**:

- Keep Imp free of React Flow layout/UI fields (`position`, `selected`, style, etc.). Those belong on the React Flow side (or in a separate overlay), not in the core Imp model.
- Preserve Imp as the canonical transmission format when persisting or sending graphs between systems.
- Resolve port **templates** (signal types, output handles) from a `NodeLibrary` / registry via `Node.type` — not by stashing `Ports` on RF `node.data`.

### Conceptual mapping

| Imp | React Flow |
| --- | --- |
| `Node.id` | `Node.id` |
| `Node.type` | `Node.type` (RF node component type) |
| `Node.inputs` (`InputValues`) | `node.data.inputValues` |
| Catalog `NodeType.outputs` port ids | source `Handle` `id` (looked up via registry) |
| Catalog `NodeType.inputs` port ids | target `Handle` `id` (looked up via registry) |
| `Edge` key (`EdgeId`) | `Edge.id` |
| `Edge.from.node` | `Edge.source` |
| `Edge.from.port` | `Edge.sourceHandle` |
| `Edge.to.node` | `Edge.target` |
| `Edge.to.port` | `Edge.targetHandle` |

### React Flow `node.data` shape

Package-local payload on RF nodes:

| Field | Type |
| --- | --- |
| `inputValues` | `InputValues` |

Port templates live on `NodeType` in a registry/library. Editors that need handle lists look up `getNodeType(registry, node.type)`.

### Layout policy

Imp does **not** require a `position` field; React Flow nodes typically do. Converters inject default `position: { x: 0, y: 0 }` on Imp→RF and drop `position`, selection, style, and other UI fields on RF→Imp.

## Design rationale

React Flow is a common web graph editor. Aligning Imp ports with RF handles keeps Imp usable as the shared model behind interactive UIs without baking UI concerns into [graph-model.md](https://github.com/silentorb/imp-spec/blob/main/docs/packages/imp-core-types/graph-model.md). Stashing `InputValues` on `node.data` preserves instance literals across round-trips; catalog port shapes stay in libraries.

## Behavior / pipeline

1. `impToReactFlow(graph)` → `{ nodes, edges }`
   - One RF node per Imp node; copy `id`, `type`; set `data.inputValues` from Imp `Node.inputs`; default `position`.
   - One RF edge per Imp edge; `id` from `EdgeId`; `source` / `target` / `sourceHandle` / `targetHandle` from port references.
2. `reactFlowToImp(nodes, edges)` → `Graph`
   - Rebuild `Graph.nodes` from RF nodes (require `data.inputValues`).
   - Rebuild `Graph.edges` from RF edges; require both handle ids.

## Configuration

None.

## See also

- [graph-model.md](https://github.com/silentorb/imp-spec/blob/main/docs/packages/imp-core-types/graph-model.md)
- Root [AGENTS.md](../../AGENTS.md)
