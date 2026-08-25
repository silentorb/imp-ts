/** Collection transform NodeLibrary. Spec: docs/features/collection-transforms.md */

import type { NodeLibrary, Port, SignalType } from "imp-spec"

const collection: SignalType = { id: "collection" }
const boolean: SignalType = { id: "boolean" }
const string: SignalType = { id: "string" }
const number: SignalType = { id: "number" }
const any: SignalType = { id: "any" }

function port(id: string, type: SignalType, defaultValue?: Port["defaultValue"]): Port {
  return defaultValue === undefined
    ? { id, type }
    : { id, type, defaultValue }
}

function collectionIn(): Port {
  return port("collection", collection)
}

function collectionOut(): Port {
  return port("collection", collection)
}

export const collectionTransformsLibrary: NodeLibrary = {
  id: "imp.collection.transforms",
  types: {
    filter: {
      id: "filter",
      inputs: {
        collection: collectionIn(),
        predicate: port("predicate", boolean),
      },
      outputs: {
        collection: collectionOut(),
      },
    },
    except: {
      id: "except",
      inputs: {
        collection: collectionIn(),
        exclude: port("exclude", collection),
      },
      outputs: {
        collection: collectionOut(),
      },
    },
    sort: {
      id: "sort",
      inputs: {
        collection: collectionIn(),
        column: port("column", string),
        direction: port("direction", string, "asc"),
      },
      outputs: {
        collection: collectionOut(),
      },
    },
    limit: {
      id: "limit",
      inputs: {
        collection: collectionIn(),
        count: port("count", number),
      },
      outputs: {
        collection: collectionOut(),
      },
    },
    offset: {
      id: "offset",
      inputs: {
        collection: collectionIn(),
        count: port("count", number),
      },
      outputs: {
        collection: collectionOut(),
      },
    },
    project: {
      id: "project",
      inputs: {
        collection: collectionIn(),
        columns: port("columns", string),
      },
      outputs: {
        collection: collectionOut(),
      },
    },
    group: {
      id: "group",
      inputs: {
        collection: collectionIn(),
        column: port("column", string),
        direction: port("direction", string, "asc"),
      },
      outputs: {
        collection: collectionOut(),
      },
    },
    search: {
      id: "search",
      inputs: {
        collection: collectionIn(),
        query: port("query", string),
      },
      outputs: {
        collection: collectionOut(),
      },
    },
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
