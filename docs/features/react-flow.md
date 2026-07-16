# React Flow integration

## Summary

A primary Imp consumer will be **React Flow** ([`@xyflow/react`](https://reactflow.dev/)). Imp and React Flow both express node–edge graphs; Imp is the portable transmission model, React Flow is a UI/editor representation. Bidirectional converters will live in a future package (working name: `imp-react-flow`). **No converter code ships in this scaffold.**

## When to read this

- Designing Imp ↔ React Flow mapping
- Changing Imp ports/edges in ways that affect handle identity
- Implementing or regenerating converter packages later

## Requirements

### Compatibility goals

Converters **must**:

1. Round-trip Imp `Graph` ↔ React Flow `{ nodes, edges }` without losing Imp topology (node ids, port ids, edge ids, `from`/`to` port references).
2. Map Imp port ids to React Flow **handle** ids (`sourceHandle` / `targetHandle`).
3. Map Imp edges (`from` / `to` as `PortReference`) to React Flow edges (`source` / `target` plus optional handle ids).

Converters **should**:

- Keep Imp free of React Flow layout/UI fields (`position`, `selected`, style, etc.). Those belong on the React Flow side (or in a separate overlay), not in the core Imp model.
- Preserve Imp as the canonical transmission format when persisting or sending graphs between systems.

### Conceptual mapping

| Imp | React Flow |
| --- | --- |
| `Node.id` | `Node.id` |
| `Node.type` | `Node.type` (RF node component type) |
| `PortId` on `outputs` | source `Handle` `id` |
| `PortId` on `inputs` | target `Handle` `id` |
| `Edge` key (`EdgeId`) | `Edge.id` |
| `Edge.from.node` | `Edge.source` |
| `Edge.from.port` | `Edge.sourceHandle` |
| `Edge.to.node` | `Edge.target` |
| `Edge.to.port` | `Edge.targetHandle` |
| `Node.inputs` / `Node.outputs` values | RF `data` / custom node props (TBD when `Input`/`Output` are filled in) |

Imp does **not** require a `position` field; React Flow nodes typically do. Converters may inject default positions on Imp→RF and drop positions on RF→Imp unless a future Imp extension documents layout.

## Design rationale

React Flow is a common web graph editor. Aligning Imp ports with RF handles keeps Imp usable as the shared model behind interactive UIs without baking UI concerns into [`graph-model.md`](./graph-model.md).

## Behavior / pipeline

Deferred. Expected later:

1. `impToReactFlow(graph): { nodes, edges }`
2. `reactFlowToImp(nodes, edges): Graph`

Exact function names and package layout will be specified when that package is added.

## Inputs / outputs / artifacts

| Artifact | Status |
| --- | --- |
| This doc | Design notes only |
| Converter package | Not created yet |

## Quick start

None yet — no package to import.

## Configuration

None.

## Verification

N/A until converters exist. When they do: round-trip tests on sample graphs; regenerate converter types from this doc + [graph-model.md](./graph-model.md) if the mapping tables change.

## Implementation pointers

- Core model: [graph-model.md](./graph-model.md), `packages/imp-spec`
- React Flow edge/handle docs: [Edges](https://reactflow.dev/api-reference/types/edge), [Handles](https://reactflow.dev/learn/customization/handles)

## See also

- [graph-model.md](./graph-model.md)
- Root [AGENTS.md](../../AGENTS.md)
