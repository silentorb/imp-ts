import type { InputValues } from "imp-spec"

/** Imp instance input literals stashed on React Flow `node.data` for round-trip. */
export interface ImpReactFlowNodeData extends Record<string, unknown> {
  inputValues: InputValues
}
