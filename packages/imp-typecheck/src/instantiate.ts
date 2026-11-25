/** NodeDefinition instantiation. Spec: imp-spec/docs/packages/imp-typecheck/type-system.md */

import type { Graph, NodeDefinition, Port, Ports, Type } from "imp-core-types"
import { isTypeVar } from "imp-core-types"
import { assertConcreteArgs } from "./substitution"

function substituteInType(
  type: Type,
  params: string[],
  args: Type[],
): Type {
  if (isTypeVar(type)) {
    const index = params.indexOf(type.param)
    if (index === -1) {
      throw new Error(`unknown type parameter "${type.param}"`)
    }
    return args[index]!
  }
  if ("id" in type && type.args?.length) {
    return {
      id: type.id,
      args: type.args.map((arg) => substituteInType(arg, params, args)),
    }
  }
  return type
}

function substitutePorts(ports: Ports, params: string[], args: Type[]): Ports {
  const result: Ports = {}
  for (const [key, port] of Object.entries(ports)) {
    result[key] = substitutePort(port, params, args)
  }
  return result
}

function substitutePort(port: Port, params: string[], args: Type[]): Port {
  return {
    ...port,
    type: substituteInType(port.type, params, args),
  }
}

function substituteInGraph(graph: Graph, params: string[], args: Type[]): Graph {
  const nodes: Graph["nodes"] = {}
  for (const [id, node] of Object.entries(graph.nodes)) {
    nodes[id] = {
      ...node,
      typeArgs: node.typeArgs?.map((typeArg) => substituteInType(typeArg, params, args)),
    }
  }
  return { nodes, edges: { ...graph.edges } }
}

export function instantiateNodeDefinition(
  definition: NodeDefinition,
  typeArgs: Type[],
): NodeDefinition {
  const params = definition.typeParams?.map((p) => p.id) ?? []
  if (params.length !== typeArgs.length) {
    throw new Error(
      `expected ${params.length} typeArgs for NodeDefinition "${definition.id}", got ${typeArgs.length}`,
    )
  }
  const concreteCheck = assertConcreteArgs(typeArgs)
  if (typeof concreteCheck === "string") {
    throw new Error(concreteCheck)
  }

  return {
    ...definition,
    typeParams: undefined,
    inputs: substitutePorts(definition.inputs, params, typeArgs),
    outputs: substitutePorts(definition.outputs, params, typeArgs),
    body: definition.body
      ? substituteInGraph(definition.body, params, typeArgs)
      : undefined,
  }
}

/** @deprecated Use instantiateNodeDefinition */
export const instantiateNodeType = instantiateNodeDefinition
