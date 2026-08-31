/** Dynamic Imp graph execution. Spec: imp-spec/docs/packages/imp-execution/execution.md */

import type { Graph, PortReference } from "imp-core-types";
import type { Registry } from "imp-registry";
import { hasGraphBackedDefinitions } from "imp-registry";
import {
  buildExecutionProgram,
  type ExecutionProgram,
} from "imp-graph-resolve";
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
  /** Pre-built program; built automatically when graph-backed definitions are registered. */
  program?: ExecutionProgram;
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

  const program =
    options.program ??
    (hasGraphBackedDefinitions(options.registry)
      ? buildExecutionProgram(graph, options.registry)
      : { root: graph, subgraphs: new Map() });

  const root = program.root;
  const source = options.source ?? defaultSource(root);
  const sink = options.sink ?? defaultSink(root);
  const edgesByTarget = indexEdgesByTarget(root);

  const ctx = {
    graph: root,
    registry: options.registry,
    host: options.host,
    edgesByTarget,
    visiting: new Set<string>(),
    sourceNodeId: source.node,
    executionProgram: program,
    compositeFrame: undefined,
  };

  const sinkNode = root.nodes[sink.node];
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

export type { ExecutionProgram };
