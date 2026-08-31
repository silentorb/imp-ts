/** Core boundary node types. Authoritative spec: imp-spec/docs/packages/imp-core-types/graph-model.md */

import type { NodeLibrary } from "./library"
import { concreteType, typeVar } from "./signal-type"

const T = typeVar("T")
const stringSignal = concreteType("string")
const anySignal = concreteType("any")

const typeParamT = [{ id: "T" as const }]

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
      typeParams: typeParamT,
      inputs: {},
      outputs: {
        value: { id: "value", type: T },
      },
    },
    output: {
      id: "output",
      typeParams: typeParamT,
      inputs: {
        value: { id: "value", type: T },
      },
      outputs: {},
    },
    parameter: {
      id: "parameter",
      typeParams: typeParamT,
      inputs: {
        label: { id: "label", type: stringSignal, defaultValue: "" },
        value: { id: "value", type: anySignal, defaultValue: null },
      },
      outputs: {
        value: { id: "value", type: T },
      },
    },
  },
}
