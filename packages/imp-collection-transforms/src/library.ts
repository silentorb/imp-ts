/** Collection transform NodeLibrary. Spec: imp-spec/docs/packages/imp-collection-transforms/collection-transforms.md */

import {
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
): NodeLibrary["types"][string] {
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
  types: {
    filter: collectionPreserving("filter", {
      predicate: port("predicate", boolean),
    }),
    except: collectionPreserving("except", {
      exclude: port("exclude", collectionT),
    }),
    sort: collectionPreserving("sort", {
      column: port("column", string),
      direction: port("direction", string, "asc"),
    }),
    limit: collectionPreserving("limit", {
      count: port("count", number),
    }),
    offset: collectionPreserving("offset", {
      count: port("count", number),
    }),
    project: collectionPreserving("project", {
      columns: port("columns", string),
    }),
    group: collectionPreserving("group", {
      column: port("column", string),
      direction: port("direction", string, "asc"),
    }),
    search: collectionPreserving("search", {
      query: port("query", string),
    }),
    contains: {
      id: "contains",
      inputs: {
        haystack: port("haystack", any),
        needle: port("needle", string),
      },
      outputs: {
        value: port("value", boolean),
      },
    },
    equals: {
      id: "equals",
      inputs: {
        left: port("left", any),
        right: port("right", any),
      },
      outputs: {
        value: port("value", boolean),
      },
    },
    not_equals: {
      id: "not_equals",
      inputs: {
        left: port("left", any),
        right: port("right", any),
      },
      outputs: {
        value: port("value", boolean),
      },
    },
    less_than: {
      id: "less_than",
      inputs: {
        left: port("left", any),
        right: port("right", any),
      },
      outputs: {
        value: port("value", boolean),
      },
    },
    greater_than: {
      id: "greater_than",
      inputs: {
        left: port("left", any),
        right: port("right", any),
      },
      outputs: {
        value: port("value", boolean),
      },
    },
    and: {
      id: "and",
      inputs: {
        left: port("left", boolean),
        right: port("right", boolean),
      },
      outputs: {
        value: port("value", boolean),
      },
    },
    or: {
      id: "or",
      inputs: {
        left: port("left", boolean),
        right: port("right", boolean),
      },
      outputs: {
        value: port("value", boolean),
      },
    },
    not: {
      id: "not",
      inputs: {
        value: port("value", boolean),
      },
      outputs: {
        value: port("value", boolean),
      },
    },
    column: {
      id: "column",
      inputs: {
        name: port("name", string),
      },
      outputs: {
        value: port("value", any),
      },
    },
    literal: {
      id: "literal",
      inputs: {
        value: port("value", any),
      },
      outputs: {
        value: port("value", any),
      },
    },
  },
}
