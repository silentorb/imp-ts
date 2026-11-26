/** Type normalization: type-definition expansion and union canonicalization. Spec: imp-spec/docs/packages/imp-typecheck/type-system.md (Normalization) */

import type {
  Graph,
  GraphSource,
  Node,
  NodeDefinition,
  NodeId,
  NodeImplementation,
  Ports,
  Type,
  TypeParam,
} from "imp-core-types"
import { isTypeVar, isUnionType, mapChildTypes } from "imp-core-types"
import type { Registry } from "imp-registry"
import { getTypeDefinition } from "imp-registry"
import { canonicalUnion } from "./substitution"

/**
 * Expands defined names (substituting their params) and canonicalizes unions: nested unions
 * flatten, `any` absorbs, duplicates drop (first occurrence wins), one-member unions collapse.
 *
 * Invalid references (wrong arity, or a cycle) are left unexpanded; `checkTypeDefinitions` and
 * the reference checks report them.
 */
export function normalizeType(type: Type, registry: Registry): Type {
  return normalizeWith(type, registry, [])
}

function normalizeWith(type: Type, registry: Registry, expanding: readonly string[]): Type {
  if (isTypeVar(type)) return type

  if (isUnionType(type)) {
    return canonicalUnion(type.union.map((member) => normalizeWith(member, registry, expanding)))
  }

  const args = (type.args ?? []).map((arg) => normalizeWith(arg, registry, expanding))
  const definition = getTypeDefinition(registry, type.id)
  const params = definition?.params ?? []
  if (!definition || params.length !== args.length || expanding.includes(type.id)) {
    return args.length ? { id: type.id, args } : { id: type.id }
  }

  const expanded = substituteParams(definition.type, params, args)
  return normalizeWith(expanded, registry, [...expanding, type.id])
}

function substituteParams(type: Type, params: readonly TypeParam[], args: readonly Type[]): Type {
  if (isTypeVar(type)) {
    const index = params.findIndex((param) => param.id === type.param)
    return index === -1 ? type : args[index]!
  }
  return mapChildTypes(type, (child) => substituteParams(child, params, args))
}

function normalizePorts(ports: Ports, registry: Registry): Ports {
  const result: Ports = {}
  for (const [key, port] of Object.entries(ports)) {
    result[key] = { ...port, type: normalizeType(port.type, registry) }
  }
  return result
}

function normalizeImplementation(
  implementation: NodeImplementation | undefined,
  registry: Registry,
): NodeImplementation | undefined {
  if (!implementation || implementation.kind !== "dispatch") return implementation
  return {
    ...implementation,
    cases: implementation.cases.map((entry) => ({
      ...entry,
      match: normalizeType(entry.match, registry),
    })),
  }
}

export function normalizeNode(node: Node, registry: Registry): Node {
  if (!node.typeArgs?.length) return node
  return { ...node, typeArgs: node.typeArgs.map((arg) => normalizeType(arg, registry)) }
}

function normalizeGraph(graph: Graph, registry: Registry): Graph {
  const nodes: Graph["nodes"] = {}
  for (const [id, node] of Object.entries(graph.nodes)) {
    nodes[id] = normalizeNode(node, registry)
  }
  return { ...graph, nodes }
}

/** A definition with every type it carries normalized (ports, bounds, dispatch patterns, body). */
export function normalizeDefinition(definition: NodeDefinition, registry: Registry): NodeDefinition {
  return {
    ...definition,
    typeParams: definition.typeParams?.map((param) =>
      param.bounds ? { ...param, bounds: param.bounds.map((b) => normalizeType(b, registry)) } : param,
    ),
    implementation: normalizeImplementation(definition.implementation, registry),
    inputs: normalizePorts(definition.inputs, registry),
    outputs: normalizePorts(definition.outputs, registry),
    body: definition.body ? normalizeGraph(definition.body, registry) : undefined,
  }
}

const normalizedRegistries = new WeakSet<Registry>()
const normalizedRegistryCache = new WeakMap<Registry, Registry>()

/**
 * The registry with every node definition normalized. Typecheck entry points run on this view,
 * so internal rules only ever see normalized types. Cached per registry; idempotent.
 */
export function normalizedRegistry(registry: Registry): Registry {
  if (normalizedRegistries.has(registry)) return registry
  const cached = normalizedRegistryCache.get(registry)
  if (cached) return cached

  const definitions: Record<string, readonly NodeDefinition[]> = {}
  for (const [id, overloads] of Object.entries(registry.definitions)) {
    definitions[id] = overloads.map((definition) => normalizeDefinition(definition, registry))
  }
  const normalized: Registry = { ...registry, definitions }
  normalizedRegistries.add(normalized)
  normalizedRegistryCache.set(registry, normalized)
  return normalized
}

const normalizedSources = new WeakSet<GraphSource>()

/** A graph source whose nodes' `typeArgs` are normalized against `registry`. Idempotent. */
export function normalizedSource(source: GraphSource, registry: Registry): GraphSource {
  if (normalizedSources.has(source)) return source
  const cache = new Map<NodeId, Node | undefined>()
  const nodes = source.nodes
  const wrapped: GraphSource = {
    edges: source.edges,
    nodes: {
      getNode(id) {
        if (cache.has(id)) return cache.get(id)
        const node = nodes.getNode(id)
        const normalized = node ? normalizeNode(node, registry) : undefined
        cache.set(id, normalized)
        return normalized
      },
      ...(nodes.nodeIds ? { nodeIds: () => nodes.nodeIds!() } : {}),
    },
  }
  normalizedSources.add(wrapped)
  return wrapped
}

/** Normalized registry + source pair for a typecheck entry point. */
export function prepare(
  source: GraphSource,
  registry: Registry,
): { source: GraphSource; registry: Registry } {
  const normalized = normalizedRegistry(registry)
  return { source: normalizedSource(source, normalized), registry: normalized }
}

