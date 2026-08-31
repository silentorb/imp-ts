/** Pathing NodeLibrary. Spec: imp-spec/docs/packages/imp-pathing/pathing.md */

import {
  type NodeLibrary,
  type Port,
  collectionOf,
  concreteType,
  typeVar,
  universalImplementation,
} from "imp-core-types"

const T = typeVar("T")
const collectionT = collectionOf(T)
const string = concreteType("string")
const number = concreteType("number")
const any = concreteType("any")

function port(id: string, type: Port["type"], defaultValue?: Port["defaultValue"]): Port {
  return defaultValue === undefined
    ? { id, type }
    : { id, type, defaultValue }
}

export const pathingLibrary: NodeLibrary = {
  id: "imp.pathing",
  definitions: [
    {
      id: "traverse",
      typeParams: [{ id: "T" }],
      implementation: universalImplementation("traverse"),
      inputs: {
        collection: port("collection", collectionT),
        association: port("association", string),
        direction: port("direction", number, 0),
        edge_property: port("edge_property", string, null),
        edge_equals: port("edge_equals", any, null),
      },
      outputs: {
        collection: port("collection", collectionT),
      },
    },
  ],
}
