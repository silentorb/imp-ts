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
| `NodeTypeId` | Discriminator / type name for a node |
| `PortId` | Key for an input or output port on a node |

### Port payloads (stubs)

| Name | Shape | Notes |
| --- | --- | --- |
| `Input` | empty object `{}` | Stub — fields TBD; still a distinct named type |
| `Output` | empty object `{}` | Stub — fields TBD; still a distinct named type |

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
| `inputs` | map `PortId` → `Input` | must (may be empty) |
| `outputs` | map `PortId` → `Output` | must (may be empty) |

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
2. For every edge, `from.node` and `to.node` must exist in `Graph.nodes`.
3. For every edge, `from.port` must exist in that node's `outputs`, and `to.port` must exist in that node's `inputs`.
4. The graph is intended to be a **DAG** (no directed cycles) for Imp transmission use cases; cycle detection is a future validation concern.
5. `Input` / `Output` remain empty stubs until a later revision of this doc fills them in.

### TypeScript binding (illustrative)

The TypeScript package must express the model as:

```ts
type NodeId = string
type EdgeId = string
type NodeTypeId = string
type PortId = string

interface Input {}
interface Output {}

interface PortReference {
  node: NodeId
  port: PortId
}

interface Node {
  id: NodeId
  type: NodeTypeId
  inputs: Record<PortId, Input>
  outputs: Record<PortId, Output>
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
- **Record/map keyed by id** makes merge, lookup, and partial update straightforward for transmission and UI state.
- **Separate `EdgeId`** allows multiple edges and stable identity without encoding topology into the id.
- **Empty `Input`/`Output` stubs** reserve named types so later fields do not require renaming the ports maps.

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

- [react-flow.md](./react-flow.md)
- Root [AGENTS.md](../../AGENTS.md)
