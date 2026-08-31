/** Registry for loading NodeLibrary and GraphTypeLibrary catalogs. Spec: imp-spec/docs/packages/imp-registry/registry.md */

import type {
  GraphType,
  GraphTypeId,
  GraphTypeLibrary,
  NodeLibrary,
  NodeType,
  NodeTypeId,
} from "imp-core-types"

export interface Registry {
  readonly libraries: readonly NodeLibrary[]
  readonly graphTypeLibraries: readonly GraphTypeLibrary[]
  readonly types: Readonly<Record<NodeTypeId, NodeType>>
  readonly graphTypes: Readonly<Record<GraphTypeId, GraphType>>
}

export function createRegistry(): Registry {
  return {
    libraries: [],
    graphTypeLibraries: [],
    types: {},
    graphTypes: {},
  }
}

export function loadLibrary(registry: Registry, library: NodeLibrary): Registry {
  const types: Record<NodeTypeId, NodeType> = { ...registry.types }

  for (const [key, nodeType] of Object.entries(library.types)) {
    if (key in types) {
      throw new Error(
        `NodeTypeId "${key}" is already registered (loading library "${library.id}")`,
      )
    }
    types[key] = nodeType
  }

  return {
    ...registry,
    libraries: [...registry.libraries, library],
    types,
  }
}

export function loadGraphTypeLibrary(
  registry: Registry,
  library: GraphTypeLibrary,
): Registry {
  const graphTypes: Record<GraphTypeId, GraphType> = { ...registry.graphTypes }

  for (const [key, graphType] of Object.entries(library.types)) {
    if (key in graphTypes) {
      throw new Error(
        `GraphTypeId "${key}" is already registered (loading library "${library.id}")`,
      )
    }
    graphTypes[key] = graphType
  }

  return {
    ...registry,
    graphTypeLibraries: [...registry.graphTypeLibraries, library],
    graphTypes,
  }
}

export function getNodeType(
  registry: Registry,
  typeId: NodeTypeId,
): NodeType | undefined {
  return registry.types[typeId]
}

export function getGraphType(
  registry: Registry,
  graphTypeId: GraphTypeId,
): GraphType | undefined {
  return registry.graphTypes[graphTypeId]
}

export function listNodeTypes(registry: Registry): NodeType[] {
  return Object.values(registry.types)
}

export function listGraphTypes(registry: Registry): GraphType[] {
  return Object.values(registry.graphTypes)
}

export function listLibraries(registry: Registry): readonly NodeLibrary[] {
  return registry.libraries
}

export function listGraphTypeLibraries(
  registry: Registry,
): readonly GraphTypeLibrary[] {
  return registry.graphTypeLibraries
}
