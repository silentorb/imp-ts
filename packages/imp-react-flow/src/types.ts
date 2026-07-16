import type { Ports } from "imp-spec"

/** Imp port maps stashed on React Flow `node.data` for round-trip. */
export interface ImpReactFlowNodeData extends Record<string, unknown> {
  inputs: Ports
  outputs: Ports
}
