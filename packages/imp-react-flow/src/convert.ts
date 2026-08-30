import type { Edge as ImpEdge, Graph, Node as ImpNode, PortId } from "imp-core-types"
import type { Edge as RfEdge, Node as RfNode } from "@xyflow/react"
import type { ImpReactFlowNodeData } from "./types"

export type ImpReactFlowNode = RfNode<ImpReactFlowNodeData>
export type ImpReactFlowEdge = RfEdge

export interface ReactFlowGraph {
  nodes: ImpReactFlowNode[]
  edges: ImpReactFlowEdge[]
}

const DEFAULT_POSITION = { x: 0, y: 0 }

function requireHandle(
  handle: string | null | undefined,
  role: "sourceHandle" | "targetHandle",
  edgeId: string,
): PortId {
  if (handle == null || handle === "") {
    throw new Error(`React Flow edge "${edgeId}" is missing required ${role}`)
  }
  return handle
}

function requireNodeData(node: ImpReactFlowNode): ImpReactFlowNodeData {
  const data = node.data
  if (data == null || typeof data !== "object") {
    throw new Error(`React Flow node "${node.id}" is missing Imp data (inputValues)`)
  }
  if (!("inputValues" in data)) {
    throw new Error(`React Flow node "${node.id}" data must include inputValues`)
  }
  return data as ImpReactFlowNodeData
}

/** Convert an Imp graph to React Flow nodes and edges. */
export function impToReactFlow(graph: Graph): ReactFlowGraph {
  const nodes: ImpReactFlowNode[] = Object.values(graph.nodes).map((node: ImpNode) => ({
    id: node.id,
    type: node.type,
    position: { ...DEFAULT_POSITION },
    data: {
      inputValues: node.inputs,
    },
  }))

  const edges: ImpReactFlowEdge[] = Object.entries(graph.edges).map(([id, edge]) => ({
    id,
    source: edge.from.node,
    sourceHandle: edge.from.port,
    target: edge.to.node,
    targetHandle: edge.to.port,
  }))

  return { nodes, edges }
}

/** Convert React Flow nodes and edges to an Imp graph. */
export function reactFlowToImp(
  nodes: ImpReactFlowNode[],
  edges: ImpReactFlowEdge[],
): Graph {
  const impNodes: Graph["nodes"] = {}
  for (const node of nodes) {
    const data = requireNodeData(node)
    impNodes[node.id] = {
      id: node.id,
      type: node.type ?? "",
      inputs: data.inputValues,
    }
  }

  const impEdges: Graph["edges"] = {}
  for (const edge of edges) {
    const fromPort = requireHandle(edge.sourceHandle, "sourceHandle", edge.id)
    const toPort = requireHandle(edge.targetHandle, "targetHandle", edge.id)
    const impEdge: ImpEdge = {
      from: { node: edge.source, port: fromPort },
      to: { node: edge.target, port: toPort },
    }
    impEdges[edge.id] = impEdge
  }

  return { nodes: impNodes, edges: impEdges }
}
