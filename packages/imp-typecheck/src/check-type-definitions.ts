/** Type-definition validation. Spec: imp-spec/docs/packages/imp-typecheck/type-system.md (checkTypeDefinitions) */

import type { NodeDefinition, Type, TypeDefinition } from "imp-core-types"
import { childTypes, isConcreteType, isTypeVar, isUnionType } from "imp-core-types"
import type { Registry } from "imp-registry"
import { getTypeDefinition, listNodeDefinitions, listTypeDefinitions } from "imp-registry"
import type { TypeCheckError } from "./substitution"

/**
 * Problems with references to defined names inside `type`: wrong argument counts and empty
 * unions. Type variables are not checked here.
 */
export function typeReferenceProblems(type: Type, registry: Registry): string[] {
  const problems: string[] = []
  visit(type)
  return problems

  function visit(current: Type): void {
    if (isUnionType(current) && current.union.length === 0) {
      problems.push("a union must have at least one member")
    }
    if (isConcreteType(current)) {
      const definition = getTypeDefinition(registry, current.id)
      const expected = definition?.params?.length ?? 0
      const actual = current.args?.length ?? 0
      if (definition && expected !== actual) {
        problems.push(`type "${current.id}" expects ${expected} type arguments, got ${actual}`)
      }
    }
    childTypes(current).forEach(visit)
  }
}

function referencedDefinitions(type: Type, registry: Registry, into: Set<string>): Set<string> {
  if (isConcreteType(type) && getTypeDefinition(registry, type.id)) into.add(type.id)
  for (const child of childTypes(type)) referencedDefinitions(child, registry, into)
  return into
}

function unknownParams(definition: TypeDefinition): string[] {
  const declared = new Set((definition.params ?? []).map((param) => param.id))
  const unknown: string[] = []
  visit(definition.type)
  return unknown

  function visit(current: Type): void {
    if (isTypeVar(current) && !declared.has(current.param) && !unknown.includes(current.param)) {
      unknown.push(current.param)
    }
    childTypes(current).forEach(visit)
  }
}

/** Ids of type definitions that refer to themselves, directly or through other definitions. */
function cyclicDefinitions(registry: Registry): Map<string, string[]> {
  const cycles = new Map<string, string[]>()
  const state = new Map<string, "visiting" | "done">()
  const path: string[] = []

  function visit(id: string): void {
    if (state.get(id) === "done") return
    if (state.get(id) === "visiting") {
      const cycle = [...path.slice(path.indexOf(id)), id]
      for (const member of cycle.slice(0, -1)) {
        if (!cycles.has(member)) cycles.set(member, cycle)
      }
      return
    }
    const definition = getTypeDefinition(registry, id)
    if (!definition) return
    state.set(id, "visiting")
    path.push(id)
    for (const ref of referencedDefinitions(definition.type, registry, new Set())) visit(ref)
    path.pop()
    state.set(id, "done")
  }

  for (const definition of listTypeDefinitions(registry)) visit(definition.id)
  return cycles
}

function definitionTypes(definition: NodeDefinition): Type[] {
  const types: Type[] = []
  for (const port of [...Object.values(definition.inputs), ...Object.values(definition.outputs)]) {
    types.push(port.type)
  }
  for (const param of definition.typeParams ?? []) types.push(...(param.bounds ?? []))
  if (definition.implementation?.kind === "dispatch") {
    for (const entry of definition.implementation.cases) types.push(entry.match)
  }
  for (const node of Object.values(definition.body?.nodes ?? {})) types.push(...(node.typeArgs ?? []))
  return types
}

/**
 * Validates every registered type definition (params, arity, empty unions, cycles) and the
 * references to defined names in every node definition. Run on the raw registry.
 */
export function checkTypeDefinitions(registry: Registry): TypeCheckError[] {
  const errors: TypeCheckError[] = []

  for (const definition of listTypeDefinitions(registry)) {
    for (const param of unknownParams(definition)) {
      errors.push({
        typeId: definition.id,
        message: `type "${definition.id}" refers to undeclared type parameter "${param}"`,
      })
    }
    for (const problem of typeReferenceProblems(definition.type, registry)) {
      errors.push({ typeId: definition.id, message: `type "${definition.id}": ${problem}` })
    }
  }

  for (const [id, cycle] of cyclicDefinitions(registry)) {
    errors.push({
      typeId: id,
      message: `type "${id}" refers to itself (${cycle.join(" → ")}); recursive types are not supported`,
    })
  }

  for (const definition of listNodeDefinitions(registry)) {
    const problems = new Set(
      definitionTypes(definition).flatMap((type) => typeReferenceProblems(type, registry)),
    )
    for (const problem of problems) {
      errors.push({ definitionId: definition.id, message: problem })
    }
  }

  return errors
}
