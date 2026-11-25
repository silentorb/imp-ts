/** Collection transform NodeLibrary. Spec: imp-spec/docs/packages/imp-collection-transforms/collection-transforms.md */

import {
  type NodeDefinition,
  type NodeLibrary,
  type Port,
  type Type,
  concreteType,
  listOf,
  setOf,
  typeVar,
  universalImplementation,
} from "imp-core-types"

const T = typeVar("T")
const listT = listOf(T)
const setT = setOf(T)
const boolean = concreteType("boolean")
const string = concreteType("string")
const number = concreteType("number")
const any = concreteType("any")

const collectionTypeParam = [{ id: "T" }]

function port(
  id: string,
  type: Type,
  defaultValue?: Port["defaultValue"],
  variadic?: boolean,
): Port {
  const result: Port = { id, type }
  if (defaultValue !== undefined) result.defaultValue = defaultValue
  if (variadic) result.variadic = true
  return result
}

function variadicPort(id: string, type: Type): Port {
  return port(id, type, undefined, true)
}

function kindPreserving(
  id: string,
  implementationId: string,
  containerType: Type,
  extraInputs: Record<string, Port>,
): NodeDefinition {
  const collectionPort = port("collection", containerType)
  return {
    id,
    typeParams: collectionTypeParam,
    implementation: universalImplementation(implementationId),
    inputs: { collection: collectionPort, ...extraInputs },
    outputs: { collection: port("collection", containerType) },
  }
}

function listAndSetOverloads(
  id: string,
  extraInputs: Record<string, Port>,
  extraInputsForSet?: Record<string, Port>,
): NodeDefinition[] {
  return [
    kindPreserving(id, `${id}_list`, listT, extraInputs),
    kindPreserving(id, `${id}_set`, setT, extraInputsForSet ?? extraInputs),
  ]
}

export const collectionTransformsLibrary: NodeLibrary = {
  id: "imp.collection.transforms",
  definitions: [
    ...listAndSetOverloads("filter", {
      predicate: port("predicate", boolean),
    }),
    ...listAndSetOverloads("except", {
      exclude: port("exclude", listT),
    }, {
      exclude: port("exclude", setT),
    }),
    kindPreserving("sort", "sort", listT, {
      column: port("column", string),
      direction: port("direction", string, "asc"),
    }),
    kindPreserving("limit", "limit", listT, {
      count: port("count", number),
    }),
    kindPreserving("offset", "offset", listT, {
      count: port("count", number),
    }),
    ...listAndSetOverloads("project", {
      columns: port("columns", string),
    }),
    kindPreserving("group", "group", listT, {
      column: port("column", string),
      direction: port("direction", string, "asc"),
    }),
    ...listAndSetOverloads("search", {
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
        operands: variadicPort("operands", boolean),
      },
      outputs: {
        value: port("value", boolean),
      },
    },
    {
      id: "or",
      inputs: {
        operands: variadicPort("operands", boolean),
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
