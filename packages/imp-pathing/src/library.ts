/** Pathing NodeLibrary. Spec: docs/features/pathing.md */

import type { NodeLibrary, Port, SignalType } from "imp-spec"

const collection: SignalType = { id: "collection" }
const string: SignalType = { id: "string" }
const number: SignalType = { id: "number" }
const any: SignalType = { id: "any" }

function port(id: string, type: SignalType, defaultValue?: Port["defaultValue"]): Port {
  return defaultValue === undefined
    ? { id, type }
    : { id, type, defaultValue }
}

export const pathingLibrary: NodeLibrary = {
  id: "imp.pathing",
  types: {
    traverse: {
      id: "traverse",
      inputs: {
        collection: port("collection", collection),
        association: port("association", string),
        direction: port("direction", number, 0),
        edge_property: port("edge_property", string, null),
        edge_equals: port("edge_equals", any, null),
      },
      outputs: {
        collection: port("collection", collection),
      },
    },
  },
}
