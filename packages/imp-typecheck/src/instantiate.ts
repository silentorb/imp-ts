/** NodeType instantiation. Spec: imp-spec/docs/packages/imp-typecheck/type-system.md */

import type { NodeType, Port, Ports, SignalType } from "imp-core-types"
import { isTypeVar } from "imp-core-types"
import { assertConcreteArgs } from "./substitution"

function substituteInType(
  type: SignalType,
  params: string[],
  args: SignalType[],
): SignalType {
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

function substitutePorts(ports: Ports, params: string[], args: SignalType[]): Ports {
  const result: Ports = {}
  for (const [key, port] of Object.entries(ports)) {
    result[key] = substitutePort(port, params, args)
  }
  return result
}

function substitutePort(port: Port, params: string[], args: SignalType[]): Port {
  return {
    ...port,
    type: substituteInType(port.type, params, args),
  }
}

export function instantiateNodeType(
  nodeType: NodeType,
  typeArgs: SignalType[],
): NodeType {
  const params = nodeType.typeParams?.map((p) => p.id) ?? []
  if (params.length !== typeArgs.length) {
    throw new Error(
      `expected ${params.length} typeArgs for NodeType "${nodeType.id}", got ${typeArgs.length}`,
    )
  }
  const concreteCheck = assertConcreteArgs(typeArgs)
  if (typeof concreteCheck === "string") {
    throw new Error(concreteCheck)
  }

  return {
    ...nodeType,
    typeParams: undefined,
    inputs: substitutePorts(nodeType.inputs, params, typeArgs),
    outputs: substitutePorts(nodeType.outputs, params, typeArgs),
  }
}
