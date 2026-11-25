/** Core boundary node types. Authoritative spec: imp-spec/docs/packages/imp-core-types/graph-model.md */

import type { NodeDefinition, NodeLibrary } from "./library"
import { concreteType, listOf, typeVar } from "./type"

const T = typeVar("T")
const stringSignal = concreteType("string")
const anySignal = concreteType("any")

const typeParamT = [{ id: "T" as const }]

const inputDefinition: NodeDefinition = {
  id: "input",
  typeParams: typeParamT,
  inputs: {},
  outputs: {
    value: { id: "value", type: T },
  },
}

const outputDefinition: NodeDefinition = {
  id: "output",
  typeParams: typeParamT,
  inputs: {
    value: { id: "value", type: T },
  },
  outputs: {},
}

const parameterDefinition: NodeDefinition = {
  id: "parameter",
  typeParams: typeParamT,
  inputs: {
    label: { id: "label", type: stringSignal, defaultValue: "" },
    value: { id: "value", type: anySignal, defaultValue: null },
  },
  outputs: {
    value: { id: "value", type: T },
  },
}

const packDefinition: NodeDefinition = {
  id: "pack",
  typeParams: typeParamT,
  inputs: {
    items: { id: "items", type: T, variadic: true },
  },
  outputs: {
    list: { id: "list", type: listOf(T) },
  },
}

/**
 * Core Imp boundary nodes — one instance per external port.
 * Host wires values into `input` nodes and reads results from `output` nodes.
 * `parameter` nodes declare host-configurable values (defaults on the instance).
 * `pack` gathers ordered variadic element wires into `list<T>`.
 */
export const coreNodeLibrary: NodeLibrary = {
  id: "imp.core",
  definitions: [inputDefinition, outputDefinition, parameterDefinition, packDefinition],
}
