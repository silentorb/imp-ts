/** Dynamic Imp graph execution. Spec: docs/features/execution.md */

import type { Graph, PortReference } from "imp-spec";
import type { Registry } from "imp-registry";
import {
  DEFAULT_EXECUTION_CAPABILITIES,
  type ExecutionCapabilities,
  type ExecutionHost,
  type ExecutionResult,
} from "./host";
import { defaultSink, defaultSource, indexEdgesByTarget } from "./resolve";
import { evalCollectionPort, resultFromRows } from "./eval/collection";

export interface ExecuteGraphOptions {
  registry: Registry;
  host: ExecutionHost;
  capabilities?: ExecutionCapabilities;
  source?: PortReference;
  sink?: PortReference;
}

export async function executeGraph(
  graph: Graph,
  options: ExecuteGraphOptions,
): Promise<ExecutionResult> {
  const capabilities = options.capabilities ?? DEFAULT_EXECUTION_CAPABILITIES;
  if (!capabilities.read) {
    throw new Error("ExecutionHost must grant read capability");
  }
  if (capabilities.write) {
    throw new Error("imp-execution v1 does not support write capabilities");
  }

  const source = options.source ?? defaultSource(graph);
  const sink = options.sink ?? defaultSink(graph);
  const edgesByTarget = indexEdgesByTarget(graph);

  const ctx = {
    graph,
    registry: options.registry,
    host: options.host,
    edgesByTarget,
    visiting: new Set<string>(),
    sourceNodeId: source.node,
  };

  const sinkNode = graph.nodes[sink.node];
  if (sinkNode == null) {
    throw new Error(`Unknown sink node "${sink.node}"`);
  }

  let rows;
  if (sinkNode.type === "output" && sink.port === "value") {
    rows = await evalCollectionPort(ctx, sink.node, "value");
  } else {
    const resolved = edgesByTarget.get(`${sink.node}\0${sink.port}` as `${string}\0${string}`);
    if (resolved == null) {
      throw new Error(`Sink "${sink.node}.${sink.port}" must be a wired collection`);
    }
    rows = await evalCollectionPort(ctx, resolved.from.node, resolved.from.port);
  }

  return resultFromRows(rows);
}
