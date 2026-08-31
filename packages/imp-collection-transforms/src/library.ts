/** Collection transform NodeLibrary. Spec: imp-spec/docs/packages/imp-collection-transforms/collection-transforms.md */

import {
  type NodeDefinition,
  type NodeLibrary,
  type Port,
  type SignalType,
  collectionOf,
  concreteType,
  typeVar,
  universalImplementation,
} from "imp-core-types"

const T = typeVar("T")
const collectionT = collectionOf(T)
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

function collectionIn(): Port {
  return port("collection", collectionT)
}

function collectionOut(): Port {
  return port("collection", collectionT)
}

function collectionPreserving(
  id: string,
  extraInputs: Record<string, Port>,
): NodeDefinition {
  return {
    id,
    typeParams: collectionTypeParam,
    implementation: universalImplementation(id),
    inputs: { collection: collectionIn(), ...extraInputs },
    outputs: { collection: collectionOut() },
  }
}

export const collectionTransformsLibrary: NodeLibrary = {
  id: "imp.collection.transforms",
  definitions: [
    collectionPreserving("filter", {
      predicate: port("predicate", boolean),
    }),
    collectionPreserving("except", {
      exclude: port("exclude", collectionT),
    }),
    collectionPreserving("sort", {
      column: port("column", string),
      direction: port("direction", string, "asc"),
    }),
    collectionPreserving("limit", {
      count: port("count", number),
    }),
    collectionPreserving("offset", {
      count: port("count", number),
    }),
    collectionPreserving("project", {
      columns: port("columns", string),
    }),
    collectionPreserving("group", {
      column: port("column", string),
      direction: port("direction", string, "asc"),
    }),
    collectionPreserving("search", {
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
