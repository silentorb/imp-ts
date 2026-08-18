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

### PrimitiveValue

A **literal** value that may appear on a node instance input or as a port `defaultValue`:

| Kind | TypeScript |
| --- | --- |
| string | `string` |
| number | `number` |
| boolean | `boolean` |
| null | `null` |

```ts
type PrimitiveValue = string | number | boolean | null
```

### Port (pair)

| Field | Type | Required |
| --- | --- | --- |
| `id` | `PortId` | must |
| `type` | `SignalType` | must |
| `defaultValue` | `PrimitiveValue` | may |

One port template: identity, signal type, and optional default. Used on **catalog** `NodeType.inputs` / `NodeType.outputs` — not on graph node instances.

- **`defaultValue` unset** — input port is **required** (must resolve via an incoming edge or a local instance literal).
- **`defaultValue` set** — input port is **optional**; falls back to that value when unwired and no local literal is present.

### Ports (container)

`Ports` is a map `PortId` → `Port`. Used for both `NodeType.inputs` and `NodeType.outputs`.

A port's `id` must equal its key in the parent `Ports` map when the graph/library is well-formed.

### PortReference

| Field | Type | Required |
| --- | --- | --- |
| `node` | `NodeId` | must |
| `port` | `PortId` | must |

Identifies a specific port on a specific node.

### InputValues

Local **literal values** on a graph node instance, keyed by input `PortId`:

```ts
type InputValues = Partial<Record<PortId, PrimitiveValue>>
```

Only keys that are valid input ports on the node's `NodeType` should appear. Keys may be omitted when the value comes from an edge or a catalog `defaultValue`.

### Node

| Field | Type | Required |
| --- | --- | --- |
| `id` | `NodeId` | must |
| `type` | `NodeTypeId` | must |
| `inputs` | `InputValues` | must (may be empty) |

A **node instance**: identity, type reference, and local literal input values. Port templates (signal types, defaults, output ports) live on the catalog `NodeType` — see [node-libraries.md](./node-libraries.md).

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

### Input port resolution

Each input port on a node instance may have a **local literal** in `Node.inputs`, an **incoming edge**, both, or neither. Storage is not mutually exclusive. Resolution order:

1. **Edge** — if an edge targets the port, use the wired value (overrides any local literal).
2. Else **local literal** — `Node.inputs[portId]` when present.
3. Else **`Port.defaultValue`** from the catalog `NodeType` input template.
4. Else **error** — the port is required and unsatisfied.

When an edge is removed in an editor, the node reverts to its stored local literal (or catalog default) instead of going blank.

### Core boundary nodes

Graphs act as **subgraphs** with an external interface. Core Imp ships boundary `NodeType`s in `coreNodeLibrary` (`id: "imp.core"`) from `imp-spec`:

| NodeType | Ports | Role |
| --- | --- | --- |
| `input` | outputs: single `value` port | Brings a value **into** the graph from outside |
| `output` | inputs: single `value` port | Sends a value **out** of the graph to the host |
| `parameter` | inputs: optional `label` (`string`, default `""`), `value` (`any`, default `null`); outputs: `value` | Declares a host-configurable graph parameter. The instance `value` is the default; hosts may override it at execute time. `label` is UI metadata (not used in SQL). Lowers like `literal` (bound parameter / literal from `value`). |

**One node instance per boundary port** (not a multi-port patch board). A subgraph with three inputs and one output is three `input` nodes + one `output` node. Editors may group boundary nodes visually without changing the transmission model.

A host wires external values into `input` nodes and reads results from `output` nodes. Hosts that expose settings UI discover `parameter` nodes, present `label` + current `value`, and bind overrides into each parameter node’s `inputs.value` before lowering. Future work may add a composite `GraphType` catalog that declares a subgraph's full interface as a reusable `NodeType`; that is out of scope for this revision.

### Invariants (well-formed graphs)

These are design requirements for validators and converters (not yet enforced by runtime code in `imp-spec`):

1. Every `Node.id` must equal its key in `Graph.nodes`.
2. Every `Port.id` must equal its key in the parent `Ports` map on a `NodeType`.
3. For every edge, `from.node` and `to.node` must exist in `Graph.nodes`.
4. For every edge, `from.port` must exist in that node's `NodeType.outputs`, and `to.port` must exist in that node's `NodeType.inputs` (when types are known via a registry).
5. `Node.inputs` keys must be valid input `PortId`s for the node's `NodeType` (when type is known).
6. Required input ports (no `defaultValue`, no incoming edge, no local literal) are ill-formed when validated.
7. An input port **may** have both an edge and a local literal; the edge wins at resolution.
8. The graph is intended to be a **DAG** (no directed cycles) for Imp transmission use cases; cycle detection is a future validation concern.

### TypeScript binding (illustrative)

The TypeScript package must express the model as:

```ts
type NodeId = string
type EdgeId = string
type NodeTypeId = string
type PortId = string
type SignalTypeId = string

type PrimitiveValue = string | number | boolean | null

interface SignalType {
  id: SignalTypeId
}

interface Port {
  id: PortId
  type: SignalType
  defaultValue?: PrimitiveValue
}

type Ports = Record<PortId, Port>

type InputValues = Partial<Record<PortId, PrimitiveValue>>

interface PortReference {
  node: NodeId
  port: PortId
}

interface Node {
  id: NodeId
  type: NodeTypeId
  inputs: InputValues
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
- **Nodes as functions** — catalog `NodeType` ports are parameter and return slots; instance `Node.inputs` hold local literal values for parameters.
- **Instance literals on the node** — initial values must live somewhere; storing them on the instance (not a side map) matches common dataflow tooling and lets an edge override without discarding the local fallback.
- **`defaultValue` on port templates** — required vs optional is expressed by omitting or setting a default on the catalog `Port`, not a separate flags field.
- **`SignalType`** names the Imp type of a signal on a port; starting with `id` only leaves room for aliases and constraints later without renaming the port maps.
- **Record/map keyed by id** makes merge, lookup, and partial update straightforward for transmission and UI state.
- **Separate `EdgeId`** allows multiple edges and stable identity without encoding topology into the id.
- **Boundary `input` / `output` / `parameter` nodes** — `input`/`output` are one instance per host port; `parameter` declares host-configurable defaults that editors can expose as settings.
- **Catalog vs instance** — `NodeType` holds port templates; `Node` holds identity, type id, and local input values (`Node.type` ↔ `NodeType.id`). See [node-libraries.md](./node-libraries.md).

## Behavior / pipeline

This feature is a **data shape** only. Serialization format (JSON, etc.), validation, and converters are separate packages/docs.

## Inputs / outputs / artifacts

| Artifact | Role |
| --- | --- |
| This doc | Authoritative model spec |
| `packages/imp-spec/src/graph.ts` | TypeScript interfaces regenerated from this doc |
| `packages/imp-spec/src/core-library.ts` | Core boundary `NodeLibrary` (`input`, `output`, `parameter`) |

## Quick start

```ts
import type { Graph } from "imp-spec"
import { coreNodeLibrary } from "imp-spec"

const graph: Graph = {
  nodes: {
    in: { id: "in", type: "input", inputs: {} },
    out: { id: "out", type: "output", inputs: {} },
  },
  edges: {
    e1: {
      from: { node: "in", port: "value" },
      to: { node: "out", port: "value" },
    },
  },
}

void coreNodeLibrary
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
