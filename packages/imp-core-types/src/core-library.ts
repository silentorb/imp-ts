/** Core boundary node types. Authoritative spec: imp-spec/docs/packages/imp-core-types/graph-model.md */

import type { NodeLibrary } from "./library"

const anySignal = { id: "any" } as const
const stringSignal = { id: "string" } as const

/**
 * Core Imp boundary nodes — one instance per external port.
 * Host wires values into `input` nodes and reads results from `output` nodes.
 * `parameter` nodes declare host-configurable values (defaults on the instance).
 */
export const coreNodeLibrary: NodeLibrary = {
  id: "imp.core",
  types: {
    input: {
      id: "input",
      inputs: {},
      outputs: {
        value: { id: "value", type: anySignal },
      },
    },
    output: {
      id: "output",
      inputs: {
        value: { id: "value", type: anySignal },
      },
      outputs: {},
    },
    parameter: {
      id: "parameter",
      inputs: {
        label: { id: "label", type: stringSignal, defaultValue: "" },
        value: { id: "value", type: anySignal, defaultValue: null },
      },
      outputs: {
        value: { id: "value", type: anySignal },
      },
    },
  },
}
