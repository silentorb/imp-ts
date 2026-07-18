/** Core boundary node types. Authoritative spec: docs/features/graph-model.md */

import type { NodeLibrary } from "./library.ts"

const anySignal = { id: "any" } as const

/**
 * Core Imp boundary nodes — one instance per external port.
 * Host wires values into `input` nodes and reads results from `output` nodes.
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
  },
}
