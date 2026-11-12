/** Collection transform NodeLibrary. Spec: imp-spec/docs/packages/imp-collection-transforms/collection-transforms.md */

import {
  type NodeDefinition,
  type NodeLibrary,
  type Port,
  type SignalType,
  collectionOf,
  concreteType,
  listOf,
  typeVar,
  universalImplementation,
} from "imp-core-types"

const T = typeVar("T")
const collectionT = collectionOf(T)
const listT = listOf(T)
const boolean = concreteType("boolean")
const string = concreteType("string")
const number = concreteType("number")
const any = concreteType("any")

const collectionTypeParam = [{ id: "T" }]

function port(id: string, type: SignalType, defaultValue?: Port["defaultValue"]): Port {
  return defaultValue === undefined
    ? { id, type }
    : { id, type, defaultValue }
}

function containerPreserving(
  id: string,
  containerType: SignalType,
  extraInputs: Record<string, Port>,
): NodeDefinition {
  const collectionPort = port("collection", containerType)
  return {
    id,
    typeParams: collectionTypeParam,
    implementation: universalImplementation(id),
    inputs: { collection: collectionPort, ...extraInputs },
    outputs: { collection: port("collection", containerType) },
  }
}

export const collectionTransformsLibrary: NodeLibrary = {
  id: "imp.collection.transforms",
  definitions: [
    containerPreserving("filter", collectionT, {
      predicate: port("predicate", boolean),
    }),
    containerPreserving("except", collectionT, {
      exclude: port("exclude", collectionT),
    }),
    containerPreserving("sort", listT, {
      column: port("column", string),
      direction: port("direction", string, "asc"),
    }),
    containerPreserving("limit", listT, {
      count: port("count", number),
    }),
    containerPreserving("offset", listT, {
      count: port("count", number),
    }),
    containerPreserving("project", collectionT, {
      columns: port("columns", string),
    }),
    containerPreserving("group", listT, {
      column: port("column", string),
      direction: port("direction", string, "asc"),
    }),
    containerPreserving("search", collectionT, {
      query: port("query", string),
    }),
    {
      id: "contains",
      inputs: {
        haystack: port("haystack", any),
        needle: port("needle", string),
      },
      outputs: {
        value: port("value", boolean),
      },
    },
    {
      id: "equals",
      inputs: {
        left: port("left", any),
        right: port("right", any),
      },
      outputs: {
        value: port("value", boolean),
      },
    },
    {
      id: "not_equals",
      inputs: {
        left: port("left", any),
        right: port("right", any),
      },
      outputs: {
        value: port("value", boolean),
      },
    },
    {
      id: "less_than",
      inputs: {
        left: port("left", any),
        right: port("right", any),
      },
      outputs: {
        value: port("value", boolean),
      },
    },
    {
      id: "greater_than",
      inputs: {
        left: port("left", any),
        right: port("right", any),
      },
      outputs: {
        value: port("value", boolean),
      },
    },
    {
      id: "and",
      inputs: {
        left: port("left", boolean),
        right: port("right", boolean),
      },
      outputs: {
        value: port("value", boolean),
      },
    },
    {
      id: "or",
      inputs: {
        left: port("left", boolean),
        right: port("right", boolean),
      },
      outputs: {
        value: port("value", boolean),
      },
    },
    {
      id: "not",
      inputs: {
        value: port("value", boolean),
      },
      outputs: {
        value: port("value", boolean),
      },
    },
    {
      id: "column",
      inputs: {
        name: port("name", string),
      },
      outputs: {
        value: port("value", any),
      },
    },
    {
      id: "literal",
      inputs: {
        value: port("value", any),
      },
      outputs: {
        value: port("value", any),
      },
    },
  ],
}
