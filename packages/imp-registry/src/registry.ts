/** Registry for loading NodeLibrary catalogs. Spec: imp-spec/docs/packages/imp-registry/registry.md */

import type { NodeLibrary, NodeType, NodeTypeId } from "imp-core-types"

export interface Registry {
  readonly libraries: readonly NodeLibrary[]
  readonly types: Readonly<Record<NodeTypeId, NodeType>>
}

export function createRegistry(): Registry {
  return {
    libraries: [],
    types: {},
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
    libraries: [...registry.libraries, library],
    types,
  }
}

export function getNodeType(
  registry: Registry,
  typeId: NodeTypeId,
): NodeType | undefined {
  return registry.types[typeId]
}

export function listNodeTypes(registry: Registry): NodeType[] {
  return Object.values(registry.types)
}

export function listLibraries(registry: Registry): readonly NodeLibrary[] {
  return registry.libraries
}
