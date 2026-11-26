/** Registry for loading node libraries and type definitions. Spec: imp-spec/docs/packages/imp-registry/registry.md */

import type {
  ImpFile,
  NodeDefinition,
  NodeLibrary,
  NodeTypeId,
  Port,
  Type,
  TypeDefinition,
  TypeId,
} from "imp-core-types"
import { isConcreteType, isGraphBackedDefinition, isTypeVar, isUnionType } from "imp-core-types"

export interface Registry {
  readonly libraries: readonly NodeLibrary[]
  readonly impFiles: readonly ImpFile[]
  /** Overload sets keyed by NodeTypeId. */
  readonly definitions: Readonly<Record<NodeTypeId, readonly NodeDefinition[]>>
  /** The single global type namespace: type definitions from every loaded library. */
  readonly typeDefinitions: Readonly<Record<TypeId, TypeDefinition>>
}

export function createRegistry(): Registry {
  return {
    libraries: [],
    impFiles: [],
    definitions: {},
    typeDefinitions: {},
  }
}

/** Canonical fingerprint for overload-signature equivalence (param ids normalized by declaration order). */
export function signatureFingerprint(definition: NodeDefinition): string {
  const paramIndex = new Map((definition.typeParams ?? []).map((p, i) => [p.id, i]))

  function typeKey(type: Type): string {
    if (isTypeVar(type)) {
      const index = paramIndex.get(type.param)
      return index === undefined ? `?${type.param}` : `#${index}`
    }
    if (isUnionType(type)) return `(${type.union.map(typeKey).join("|")})`
    if (!isConcreteType(type)) return "?"
    const args = type.args?.map(typeKey).join(",") ?? ""
    return args ? `${type.id}<${args}>` : type.id
  }

  function portsKey(ports: Record<string, Port>): string {
    return Object.keys(ports)
      .sort()
      .map((id) => `${id}:${typeKey(ports[id]!.type)}`)
      .join(";")
  }

  return `in:{${portsKey(definition.inputs)}}|out:{${portsKey(definition.outputs)}}`
}

function mergeDefinitions(
  registry: Registry,
  libraryId: string,
  definitions: NodeDefinition[],
): Registry {
  const merged: Record<NodeTypeId, NodeDefinition[]> = {}
  for (const [id, overloads] of Object.entries(registry.definitions)) {
    merged[id] = [...overloads]
  }

  for (const definition of definitions) {
    const existing = merged[definition.id] ?? []
    const fingerprint = signatureFingerprint(definition)
    for (const prior of existing) {
      if (signatureFingerprint(prior) === fingerprint) {
        throw new Error(
          `NodeTypeId "${definition.id}" already has an equivalent overload (loading library "${libraryId}")`,
        )
      }
    }
    merged[definition.id] = [...existing, definition]
  }

  return {
    ...registry,
    definitions: merged,
  }
}

/** Merges type definitions into the global namespace; a duplicate `TypeId` throws. */
function mergeTypes(
  registry: Registry,
  libraryId: string,
  types: readonly TypeDefinition[] | undefined,
): Registry {
  if (!types?.length) return registry
  const typeDefinitions: Record<TypeId, TypeDefinition> = { ...registry.typeDefinitions }
  for (const definition of types) {
    if (definition.id in typeDefinitions) {
      throw new Error(
        `TypeId "${definition.id}" is already defined (loading library "${libraryId}")`,
      )
    }
    typeDefinitions[definition.id] = definition
  }
  return { ...registry, typeDefinitions }
}

export function loadNodeLibrary(registry: Registry, library: NodeLibrary): Registry {
  const withTypes = mergeTypes(registry, library.id, library.types)
  return {
    ...mergeDefinitions(withTypes, library.id, library.definitions),
    libraries: [...registry.libraries, library],
  }
}

/**
 * Merges an Imp file's `types` and `definitions` (primitive or graph-backed) into the registry.
 * Its `nodes` / `edges` are topology, not registry content (see `impFileGraphSource` in imp-file).
 */
export function loadImpFile(registry: Registry, file: ImpFile): Registry {
  const label = file.id ?? "(Imp file)"
  const withTypes = mergeTypes(registry, label, file.types)
  return {
    ...mergeDefinitions(withTypes, label, file.definitions ?? []),
    impFiles: [...registry.impFiles, file],
  }
}

/** @deprecated Use loadNodeLibrary */
export const loadLibrary = loadNodeLibrary

/** Returns the overload set for `typeId`, or an empty array if unknown. */
export function getNodeDefinitions(
  registry: Registry,
  typeId: NodeTypeId,
): readonly NodeDefinition[] {
  return registry.definitions[typeId] ?? []
}

/**
 * Sole-definition convenience: returns the definition when the overload set has
 * length 1; otherwise undefined (unknown or overloaded).
 */
export function getNodeDefinition(
  registry: Registry,
  typeId: NodeTypeId,
): NodeDefinition | undefined {
  const overloads = getNodeDefinitions(registry, typeId)
  return overloads.length === 1 ? overloads[0] : undefined
}

/** @deprecated Use getNodeDefinition */
export const getNodeType = getNodeDefinition

export function getTypeDefinition(registry: Registry, typeId: TypeId): TypeDefinition | undefined {
  return registry.typeDefinitions[typeId]
}

export function listNodeDefinitions(registry: Registry): NodeDefinition[] {
  return Object.values(registry.definitions).flatMap((overloads) => [...overloads])
}

/** @deprecated Use listNodeDefinitions */
export const listNodeTypes = listNodeDefinitions

export function listTypeDefinitions(registry: Registry): TypeDefinition[] {
  return Object.values(registry.typeDefinitions)
}

export function listLibraries(registry: Registry): readonly NodeLibrary[] {
  return registry.libraries
}

export function listImpFiles(registry: Registry): readonly ImpFile[] {
  return registry.impFiles
}

export function hasGraphBackedDefinitions(registry: Registry): boolean {
  return listNodeDefinitions(registry).some(isGraphBackedDefinition)
}
