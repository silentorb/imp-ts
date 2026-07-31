/** Pathing NodeLibrary. Spec: docs/features/pathing.md */

import type { NodeLibrary, Port, SignalType } from "imp-spec"

const collection: SignalType = { id: "collection" }
const string: SignalType = { id: "string" }

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
        edgeType: port("edgeType", string),
      },
      outputs: {
        collection: port("collection", collection),
      },
    },
  },
}
