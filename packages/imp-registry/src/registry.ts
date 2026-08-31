/** Registry for loading NodeLibrary and GraphLibrary catalogs. Spec: imp-spec/docs/packages/imp-registry/registry.md */

import type {
  GraphLibrary,
  NodeDefinition,
  NodeLibrary,
  NodeTypeId,
  TypeConstraint,
  TypeConstraintId,
  TypeConstraintLibrary,
} from "imp-core-types"
import { isGraphBackedDefinition } from "imp-core-types"

export interface Registry {
  readonly libraries: readonly NodeLibrary[]
  readonly graphLibraries: readonly GraphLibrary[]
  readonly typeConstraintLibraries: readonly TypeConstraintLibrary[]
  readonly definitions: Readonly<Record<NodeTypeId, NodeDefinition>>
  readonly typeConstraints: Readonly<Record<TypeConstraintId, TypeConstraint>>
}

export function createRegistry(): Registry {
  return {
    libraries: [],
    graphLibraries: [],
    typeConstraintLibraries: [],
    definitions: {},
    typeConstraints: {},
  }
}

function mergeDefinitions(
  registry: Registry,
  libraryId: string,
  definitions: NodeDefinition[],
): Registry {
  const merged: Record<NodeTypeId, NodeDefinition> = { ...registry.definitions }

  for (const definition of definitions) {
    if (definition.id in merged) {
      throw new Error(
        `NodeTypeId "${definition.id}" is already registered (loading library "${libraryId}")`,
      )
    }
    merged[definition.id] = definition
  }

  return {
    ...registry,
    definitions: merged,
  }
}

export function loadNodeLibrary(registry: Registry, library: NodeLibrary): Registry {
  return {
    ...mergeDefinitions(registry, library.id, library.definitions),
    libraries: [...registry.libraries, library],
  }
}

export function loadGraphLibrary(registry: Registry, library: GraphLibrary): Registry {
  for (const definition of library.definitions) {
    if (!isGraphBackedDefinition(definition)) {
      throw new Error(
        `GraphLibrary "${library.id}" entry "${definition.id}" must include body and bindings`,
      )
    }
  }

  return {
    ...mergeDefinitions(registry, library.id, library.definitions),
    graphLibraries: [...registry.graphLibraries, library],
  }
}

/** @deprecated Use loadNodeLibrary */
export const loadLibrary = loadNodeLibrary

export function loadTypeConstraintLibrary(
  registry: Registry,
  library: TypeConstraintLibrary,
): Registry {
  const typeConstraints: Record<TypeConstraintId, TypeConstraint> = {
    ...registry.typeConstraints,
  }

  for (const [key, constraint] of Object.entries(library.constraints)) {
    if (key in typeConstraints) {
      throw new Error(
        `TypeConstraintId "${key}" is already registered (loading library "${library.id}")`,
      )
    }
    typeConstraints[key] = constraint
  }

  return {
    ...registry,
    typeConstraintLibraries: [...registry.typeConstraintLibraries, library],
    typeConstraints,
  }
}

export function getNodeDefinition(
  registry: Registry,
  typeId: NodeTypeId,
): NodeDefinition | undefined {
  return registry.definitions[typeId]
}

/** @deprecated Use getNodeDefinition */
export const getNodeType = getNodeDefinition

export function getTypeConstraint(
  registry: Registry,
  constraintId: TypeConstraintId,
): TypeConstraint | undefined {
  return registry.typeConstraints[constraintId]
}

export function listNodeDefinitions(registry: Registry): NodeDefinition[] {
  return Object.values(registry.definitions)
}

/** @deprecated Use listNodeDefinitions */
export const listNodeTypes = listNodeDefinitions

export function listTypeConstraints(registry: Registry): TypeConstraint[] {
  return Object.values(registry.typeConstraints)
}

export function listLibraries(registry: Registry): readonly NodeLibrary[] {
  return registry.libraries
}

export function listGraphLibraries(registry: Registry): readonly GraphLibrary[] {
  return registry.graphLibraries
}

export function listTypeConstraintLibraries(
  registry: Registry,
): readonly TypeConstraintLibrary[] {
  return registry.typeConstraintLibraries
}

export function hasGraphBackedDefinitions(registry: Registry): boolean {
  return Object.values(registry.definitions).some(isGraphBackedDefinition)
}
