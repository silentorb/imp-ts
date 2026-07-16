# React Flow integration

## Summary

A primary Imp consumer is **React Flow** ([`@xyflow/react`](https://reactflow.dev/)). Imp and React Flow both express node–edge graphs; Imp is the portable transmission model, React Flow is a UI/editor representation. Bidirectional converters live in `packages/imp-react-flow`.

## When to read this

- Designing Imp ↔ React Flow mapping
- Changing Imp ports/edges in ways that affect handle identity
- Implementing or regenerating converter code in `imp-react-flow`

## Requirements

### Compatibility goals

Converters **must**:

1. Round-trip Imp `Graph` ↔ React Flow `{ nodes, edges }` without losing Imp topology (node ids, port ids, edge ids, `from`/`to` port references) or full `Ports` maps (including each `Port.type` / `SignalType.id`).
2. Map Imp port ids to React Flow **handle** ids (`sourceHandle` / `targetHandle`).
3. Map Imp edges (`from` / `to` as `PortReference`) to React Flow edges (`source` / `target` plus handle ids).
4. Require `sourceHandle` and `targetHandle` on every React Flow edge when converting RF→Imp (Imp fidelity — no single-port shortcut).

Converters **should**:

- Keep Imp free of React Flow layout/UI fields (`position`, `selected`, style, etc.). Those belong on the React Flow side (or in a separate overlay), not in the core Imp model.
- Preserve Imp as the canonical transmission format when persisting or sending graphs between systems.

### Conceptual mapping

| Imp | React Flow |
| --- | --- |
| `Node.id` | `Node.id` |
| `Node.type` | `Node.type` (RF node component type) |
| `Ports` keys on `outputs` (`Port.id`) | source `Handle` `id` |
| `Ports` keys on `inputs` (`Port.id`) | target `Handle` `id` |
| `Ports` values (`Port`, including `SignalType`) | stashed on RF `node.data` |
| `Edge` key (`EdgeId`) | `Edge.id` |
| `Edge.from.node` | `Edge.source` |
| `Edge.from.port` | `Edge.sourceHandle` |
| `Edge.to.node` | `Edge.target` |
| `Edge.to.port` | `Edge.targetHandle` |

### React Flow `node.data` shape

Package-local type (reuses Imp `Ports`):

```ts
{ inputs: Ports; outputs: Ports }
```

Without stashing `Ports` on `data`, RF→Imp cannot recover unused ports (React Flow has no first-class port list independent of custom node UI and edge handles).

### Layout policy

Imp does **not** require a `position` field; React Flow nodes typically do. Converters inject default `position: { x: 0, y: 0 }` on Imp→RF and drop `position`, selection, style, and other UI fields on RF→Imp.

## Design rationale

React Flow is a common web graph editor. Aligning Imp ports with RF handles keeps Imp usable as the shared model behind interactive UIs without baking UI concerns into [`graph-model.md`](./graph-model.md). Stashing full `Ports` on `node.data` preserves signal types and unused ports across round-trips.

## Behavior / pipeline

1. `impToReactFlow(graph): { nodes, edges }`
   - One RF node per Imp node; copy `id`, `type`; set `data.inputs` / `data.outputs` from Imp `Ports`; default `position`.
   - One RF edge per Imp edge; `id` from `EdgeId`; `source` / `target` / `sourceHandle` / `targetHandle` from port references.
2. `reactFlowToImp(nodes, edges): Graph`
   - Rebuild `Graph.nodes` from RF nodes (require `data.inputs` and `data.outputs`).
   - Rebuild `Graph.edges` from RF edges; require both handle ids.
   - Do not invent signal types or ports from edges alone.

Exact TypeScript types for RF nodes/edges use `@xyflow/react` `Node` / `Edge` (types only in this package — no React components).

## Inputs / outputs / artifacts

| Artifact | Role |
| --- | --- |
| This doc | Converter contract / mapping source of truth |
| `packages/imp-react-flow` | Bidirectional converters + round-trip tests |

## Quick start

```ts
import type { Graph } from "imp-spec"
import { impToReactFlow, reactFlowToImp } from "imp-react-flow"

const graph: Graph = { nodes: {}, edges: {} }
const { nodes, edges } = impToReactFlow(graph)
const roundTrip = reactFlowToImp(nodes, edges)
```

## Configuration

None.

## Verification

- `bun run typecheck` from the repo root must succeed for `imp-react-flow`.
- Round-trip tests: empty graph and multi-node multi-port graphs preserve node ids, edge ids, and full `Ports` (port ids + `SignalType.id`).

## Implementation pointers

- Core model: [graph-model.md](./graph-model.md), `packages/imp-spec`
- Package: [`packages/imp-react-flow`](../../packages/imp-react-flow/)
- React Flow edge/handle docs: [Edges](https://reactflow.dev/api-reference/types/edge), [Handles](https://reactflow.dev/learn/customization/handles)

## See also

- [graph-model.md](./graph-model.md)
- Root [AGENTS.md](../../AGENTS.md)
