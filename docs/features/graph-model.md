# Graph model

## Summary

Imp's core data model is a portable **directed graph** of nodes and port-to-port edges, intended as a universal transmission format for DAGs. This document is the language-agnostic source of truth for regenerating code type interfaces (TypeScript binding: `packages/imp-spec`).

## When to read this

- Defining or changing `Graph`, `Node`, `Edge`, port, or id types
- Regenerating `imp-spec` TypeScript interfaces from the model
- Designing converters that map another graph format onto Imp

## Requirements

### Identifiers

All of the following are **strings**:

| Name | Role |
| --- | --- |
| `NodeId` | Key for a node in `Graph.nodes` |
| `EdgeId` | Key for an edge in `Graph.edges` |
| `NodeTypeId` | Discriminator / type name for a node (function definition id); identity of a catalog `NodeType` — see [node-libraries.md](./node-libraries.md) |
| `PortId` | Key for an input or output port on a node |
| `SignalTypeId` | Identity of an Imp signal type |

### SignalType

| Field | Type | Required |
| --- | --- | --- |
| `id` | `SignalTypeId` | must |

Minimal signal-type identity for this revision. Ports are typed slots (parameters / returns); the full Imp type system (aliases, constraints, etc.) may extend `SignalType` in later revisions.

### Port (pair)

| Field | Type | Required |
| --- | --- | --- |
| `id` | `PortId` | must |
| `type` | `SignalType` | must |

One port: identity plus signal type. Nodes are like functions; inputs are parameters and outputs are return slots — both use this pair.

### Ports (container)

`Ports` is a map `PortId` → `Port`. Used for both `Node.inputs` and `Node.outputs`.

A port's `id` must equal its key in the parent `Ports` map when the graph is well-formed.

### PortReference

| Field | Type | Required |
| --- | --- | --- |
| `node` | `NodeId` | must |
| `port` | `PortId` | must |

Identifies a specific port on a specific node.

### Node

| Field | Type | Required |
| --- | --- | --- |
| `id` | `NodeId` | must |
| `type` | `NodeTypeId` | must |
| `inputs` | `Ports` | must (may be empty) |
| `outputs` | `Ports` | must (may be empty) |

A node's `id` must equal its key in `Graph.nodes` when the graph is well-formed.

### Edge

| Field | Type | Required |
| --- | --- | --- |
| `from` | `PortReference` | must |
| `to` | `PortReference` | must |

Edges connect **ports**, not bare nodes. Direction is `from` → `to` (output toward input in typical dataflow usage).

An edge's identity is its key in `Graph.edges` (`EdgeId`); the `Edge` value itself has no `id` field.

### Graph

| Field | Type | Required |
| --- | --- | --- |
| `nodes` | map `NodeId` → `Node` | must (may be empty) |
| `edges` | map `EdgeId` → `Edge` | must (may be empty) |

### Invariants (well-formed graphs)

These are design requirements for validators and converters (not yet enforced by runtime code in `imp-spec`):

1. Every `Node.id` must equal its key in `Graph.nodes`.
2. Every `Port.id` must equal its key in the parent `Ports` map (`Node.inputs` or `Node.outputs`).
3. For every edge, `from.node` and `to.node` must exist in `Graph.nodes`.
4. For every edge, `from.port` must exist in that node's `outputs`, and `to.port` must exist in that node's `inputs`.
5. The graph is intended to be a **DAG** (no directed cycles) for Imp transmission use cases; cycle detection is a future validation concern.

### TypeScript binding (illustrative)

The TypeScript package must express the model as:

```ts
type NodeId = string
type EdgeId = string
type NodeTypeId = string
type PortId = string
type SignalTypeId = string

interface SignalType {
  id: SignalTypeId
}

interface Port {
  id: PortId
  type: SignalType
}

type Ports = Record<PortId, Port>

interface PortReference {
  node: NodeId
  port: PortId
}

interface Node {
  id: NodeId
  type: NodeTypeId
  inputs: Ports
  outputs: Ports
}

interface Edge {
  from: PortReference
  to: PortReference
}

interface Graph {
  nodes: Record<NodeId, Node>
  edges: Record<EdgeId, Edge>
}
```

Maps in other languages should use that language's idiomatic string-keyed dictionary (e.g. `dict[str, Node]` in Python, `HashMap<String, Node>` in Rust).

## Design rationale

- **Port-level edges** keep connectivity precise when a node has many inputs/outputs, and align with handle-based UI graphs (see [react-flow.md](./react-flow.md)).
- **Nodes as functions** — `inputs` / `outputs` are parameter and return slots; both use the same `Port` / `Ports` types.
- **`SignalType`** names the Imp type of a signal on a port; starting with `id` only leaves room for aliases and constraints later without renaming the port maps.
- **Record/map keyed by id** makes merge, lookup, and partial update straightforward for transmission and UI state.
- **Separate `EdgeId`** allows multiple edges and stable identity without encoding topology into the id.
- **Lightweight instances** — Imp’s graph model is lean enough that a node *instance* does not need a heavy dedicated structure beyond identity: essential instance data is the **node id** and **type id** (`Node.type` ↔ catalog `NodeType.id`). Other graph formats often carry richer per-instance payloads; much of that is usually cosmetic (labels, visual coordinates) and belongs in presentation layers / converters (e.g. React Flow), not in the core Imp transmission model. Ports remain on `Node` in the current revision; catalog types are separate ([node-libraries.md](./node-libraries.md)).
- **Lean core graph / separate maps** — if `imp-spec` later needs more per-node or per-edge data, prefer **separate maps keyed by id** (relational style — e.g. `Record<NodeId, …>` alongside `Graph.nodes`) rather than widening the core `Node` / `Graph` value shapes. Keep the core graph format lean.

## Behavior / pipeline

This feature is a **data shape** only. Serialization format (JSON, etc.), validation, and converters are separate packages/docs.

## Inputs / outputs / artifacts

| Artifact | Role |
| --- | --- |
| This doc | Authoritative model spec |
| `packages/imp-spec/src/graph.ts` | TypeScript interfaces regenerated from this doc |

## Quick start

```ts
import type { Graph } from "imp-spec"

const graph: Graph = {
  nodes: {},
  edges: {},
}
```

## Configuration

None.

## Verification

- `bun run typecheck` from the repo root (or `packages/imp-spec`) must succeed.
- Types in `imp-spec` must match the field tables above.

## Implementation pointers

- Package: [`packages/imp-spec`](../../packages/imp-spec/)
- Agent notes: [`packages/imp-spec/AGENTS.md`](../../packages/imp-spec/AGENTS.md)

## See also

- [node-libraries.md](./node-libraries.md) — `NodeType` / `NodeLibrary` catalogs
- [registry.md](./registry.md) — loading libraries and looking up types
- [react-flow.md](./react-flow.md)
- Root [AGENTS.md](../../AGENTS.md)
