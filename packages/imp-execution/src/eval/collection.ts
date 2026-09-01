/** In-memory collection evaluation. Spec: imp-ts/docs/features/execution.md */

import type { BoundaryBindings, Graph, NodeId, PortId } from "imp-core-types";
import { getNodeDefinition } from "imp-registry";
import type { ExecutionProgram } from "imp-graph-resolve";
import { isGraphBackedNodeType, subgraphKey } from "imp-graph-resolve";
import type { ExecutionHost, ExecutionRow } from "../host";
import {
  indexEdgesByTarget,
  requireNode,
  resolveInput,
  type EdgeTargetKey,
} from "../resolve";

export interface CompositeEvalFrame {
  instanceId: NodeId;
  bindings: BoundaryBindings;
}

export interface EvalContext {
  graph: Graph;
  registry: Registry;
  host: ExecutionHost;
  edgesByTarget: Map<EdgeTargetKey, import("imp-core-types").Edge>;
  visiting: Set<NodeId>;
  sourceNodeId: NodeId;
  edgeType?: (association: string, direction: number) => string;
  currentRow?: ExecutionRow;
  executionProgram?: ExecutionProgram;
  compositeFrame?: CompositeEvalFrame;
  parentContext?: EvalContext;
}

function requireNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number`);
  }
  return value;
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== "string") {
    throw new Error(`${label} must be a string`);
  }
  return value;
}

function resolveLiteralOrThrow(
  ctx: EvalContext,
  nodeId: NodeId,
  portId: PortId,
  label: string,
): unknown {
  const resolved = resolveInput(
    ctx.graph,
    ctx.registry,
    ctx.edgesByTarget,
    nodeId,
    portId,
  );
  if (resolved.kind === "wire") {
    const fromType = requireNode(ctx.graph, resolved.from.node).type;
    if (fromType === "literal" || fromType === "parameter") {
      const lit = resolveInput(
        ctx.graph,
        ctx.registry,
        ctx.edgesByTarget,
        resolved.from.node,
        "value",
      );
      if (lit.kind === "literal") {
        return lit.value;
      }
    }
    throw new Error(`${label} on "${nodeId}" must resolve to a literal`);
  }
  return resolved.value;
}

function rowColumn(row: ExecutionRow, column: string): unknown {
  if (column === "id") return row.id;
  if (column === "is_archived") return row.is_archived ?? false;
  if (column.startsWith("properties.")) {
    return row.properties[column.slice("properties.".length)];
  }
  return row.properties[column];
}

function evalExpression(ctx: EvalContext, nodeId: NodeId, portId: PortId): unknown {
  const resolved = resolveInput(ctx.graph, ctx.registry, ctx.edgesByTarget, nodeId, portId);
  if (resolved.kind === "literal") {
    return resolved.value;
  }
  const fromNode = requireNode(ctx.graph, resolved.from.node);
  if (fromNode.type === "column") {
    if (!ctx.currentRow) {
      throw new Error(`column "${resolved.from.node}" requires a row context`);
    }
    const nameRaw = fromNode.inputs?.name;
    const columnName = requireString(nameRaw, "column.name");
    return rowColumn(ctx.currentRow, columnName);
  }
  if (fromNode.type === "literal" || fromNode.type === "parameter") {
    return fromNode.inputs?.value;
  }
  if (portId === "result" || portId === "value") {
    return evalPredicateValue(ctx, resolved.from.node);
  }
  throw new Error(`Unsupported expression node type "${fromNode.type}" on "${resolved.from.node}"`);
}

function evalPredicateValue(ctx: EvalContext, nodeId: NodeId): unknown {
  const node = requireNode(ctx.graph, nodeId);
  switch (node.type) {
    case "equals":
      return (
        evalExpression(ctx, nodeId, "left") === evalExpression(ctx, nodeId, "right")
      );
    case "not_equals":
      return (
        evalExpression(ctx, nodeId, "left") !== evalExpression(ctx, nodeId, "right")
      );
    case "less_than":
      return (
        Number(evalExpression(ctx, nodeId, "left")) <
        Number(evalExpression(ctx, nodeId, "right"))
      );
    case "greater_than":
      return (
        Number(evalExpression(ctx, nodeId, "left")) >
        Number(evalExpression(ctx, nodeId, "right"))
      );
    case "contains": {
      const haystack = evalExpression(ctx, nodeId, "haystack");
      const needle = evalExpression(ctx, nodeId, "needle");
      if (typeof haystack !== "string" || typeof needle !== "string") {
        return false;
      }
      return haystack.toLowerCase().includes(needle.toLowerCase());
    }
    case "and": {
      const left = resolveInput(ctx.graph, ctx.registry, ctx.edgesByTarget, nodeId, "left");
      const right = resolveInput(ctx.graph, ctx.registry, ctx.edgesByTarget, nodeId, "right");
      if (left.kind !== "wire" || right.kind !== "wire") {
        throw new Error(`and on "${nodeId}" requires wired boolean inputs`);
      }
      return evalPredicate(ctx, left.from.node) && evalPredicate(ctx, right.from.node);
    }
    case "or": {
      const left = resolveInput(ctx.graph, ctx.registry, ctx.edgesByTarget, nodeId, "left");
      const right = resolveInput(ctx.graph, ctx.registry, ctx.edgesByTarget, nodeId, "right");
      if (left.kind !== "wire" || right.kind !== "wire") {
        throw new Error(`or on "${nodeId}" requires wired boolean inputs`);
      }
      return evalPredicate(ctx, left.from.node) || evalPredicate(ctx, right.from.node);
    }
    case "not": {
      const inner = resolveInput(ctx.graph, ctx.registry, ctx.edgesByTarget, nodeId, "value");
      if (inner.kind !== "wire") {
        throw new Error(`not on "${nodeId}" requires wired value input`);
      }
      return !evalPredicate(ctx, inner.from.node);
    }
    default:
      throw new Error(`Unsupported predicate node type "${node.type}"`);
  }
}

function evalPredicate(ctx: EvalContext, nodeId: NodeId): boolean {
  return Boolean(evalPredicateValue(ctx, nodeId));
}

function inputPortForBoundNode(bindings: BoundaryBindings, nodeId: NodeId): PortId | undefined {
  for (const [portId, boundId] of Object.entries(bindings.inputs)) {
    if (boundId === nodeId) return portId;
  }
  return undefined;
}

async function evalCompositeCollectionPort(
  ctx: EvalContext,
  instanceId: NodeId,
  outputPort: PortId,
): Promise<ExecutionRow[]> {
  if (!ctx.executionProgram) {
    throw new Error(`Composite node "${instanceId}" requires an execution program`);
  }

  const instance = requireNode(ctx.graph, instanceId);
  const definition = getNodeDefinition(ctx.registry, instance.type);
  if (!definition?.bindings || !definition.body) {
    throw new Error(`Node "${instanceId}" is not a graph-backed definition`);
  }

  const key = subgraphKey(definition.id, instance.typeArgs);
  const body = ctx.executionProgram.subgraphs.get(key);
  if (!body) {
    throw new Error(`Missing shared subgraph for definition "${definition.id}"`);
  }

  const boundaryOut = definition.bindings.outputs[outputPort];
  if (!boundaryOut) {
    throw new Error(`Composite "${instanceId}" has no output binding for port "${outputPort}"`);
  }

  const innerCtx: EvalContext = {
    ...ctx,
    graph: body,
    parentContext: ctx,
    compositeFrame: {
      instanceId,
      bindings: definition.bindings,
    },
    visiting: new Set<string>(),
    edgesByTarget: indexEdgesByTarget(body),
  };

  return evalCollectionPort(innerCtx, boundaryOut, "value");
}

async function followCollectionPort(
  ctx: EvalContext,
  nodeId: NodeId,
  portId: PortId,
  label: string,
): Promise<ExecutionRow[]> {
  const resolved = resolveInput(ctx.graph, ctx.registry, ctx.edgesByTarget, nodeId, portId);
  if (resolved.kind === "literal") {
    throw new Error(`${label} on "${nodeId}" must be wired, not a literal`);
  }
  return evalCollectionPort(ctx, resolved.from.node, resolved.from.port);
}

function projectRows(rows: ExecutionRow[], columnsCsv: string): ExecutionRow[] {
  const cols = columnsCsv
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
  if (cols.length === 0) {
    throw new Error("project.columns must list at least one column");
  }
  return rows.map((row) => {
    const properties: Record<string, unknown> = {};
    const projected: ExecutionRow = { id: row.id, properties, is_archived: row.is_archived };
    for (const col of cols) {
      if (col === "id") {
        projected.id = String(rowColumn(row, col));
      } else if (col === "is_archived") {
        projected.is_archived = Boolean(rowColumn(row, col));
      } else {
        const key = col.startsWith("properties.") ? col.slice("properties.".length) : col;
        properties[key] = rowColumn(row, col);
      }
    }
    return projected;
  });
}

export async function evalCollectionPort(
  ctx: EvalContext,
  nodeId: NodeId,
  outputPort: PortId,
): Promise<ExecutionRow[]> {
  if (ctx.visiting.has(nodeId)) {
    throw new Error(`Cycle detected while executing collection at node "${nodeId}"`);
  }
  ctx.visiting.add(nodeId);
  try {
    const node = requireNode(ctx.graph, nodeId);

    switch (node.type) {
      case "input": {
        if (ctx.compositeFrame && ctx.parentContext) {
          const inputPort = inputPortForBoundNode(ctx.compositeFrame.bindings, nodeId);
          if (inputPort) {
            const parent = ctx.parentContext;
            return followCollectionPort(
              parent,
              ctx.compositeFrame.instanceId,
              inputPort,
              `composite.${inputPort}`,
            );
          }
        }
        if (nodeId !== ctx.sourceNodeId) {
          throw new Error(`Unexpected input node "${nodeId}"`);
        }
        if (outputPort !== "value") {
          throw new Error(`input node "${nodeId}" only has output port "value"`);
        }
        return await ctx.host.listInputRows();
      }
      case "output": {
        if (outputPort !== "value") {
          throw new Error(`output node "${nodeId}" only has input port "value"`);
        }
        return followCollectionPort(ctx, nodeId, "value", "output.value");
      }
      case "filter": {
        const base = await followCollectionPort(ctx, nodeId, "collection", "filter.collection");
        const pred = resolveInput(ctx.graph, ctx.registry, ctx.edgesByTarget, nodeId, "predicate");
        if (pred.kind === "literal") {
          throw new Error(`filter.predicate on "${nodeId}" must be wired`);
        }
        return base.filter((row) => {
          ctx.currentRow = row;
          return evalPredicate(ctx, pred.from.node);
        });
      }
      case "except": {
        const keep = await followCollectionPort(ctx, nodeId, "collection", "except.collection");
        const exclude = await followCollectionPort(ctx, nodeId, "exclude", "except.exclude");
        const excludeIds = new Set(exclude.map((r) => r.id));
        return keep.filter((r) => !excludeIds.has(r.id));
      }
      case "sort": {
        const base = [...(await followCollectionPort(ctx, nodeId, "collection", "sort.collection"))];
        const columnName = requireString(
          resolveLiteralOrThrow(ctx, nodeId, "column", "sort.column"),
          "sort.column",
        );
        const directionRaw = requireString(
          resolveLiteralOrThrow(ctx, nodeId, "direction", "sort.direction"),
          "sort.direction",
        ).toLowerCase();
        const sign = directionRaw === "desc" ? -1 : 1;
        base.sort((a, b) => {
          const av = rowColumn(a, columnName);
          const bv = rowColumn(b, columnName);
          if (av === bv) return 0;
          if (av == null) return 1;
          if (bv == null) return -1;
          return av < bv ? -sign : sign;
        });
        return base;
      }
      case "limit": {
        const base = await followCollectionPort(ctx, nodeId, "collection", "limit.collection");
        const count = requireNumber(
          resolveLiteralOrThrow(ctx, nodeId, "count", "limit.count"),
          "limit.count",
        );
        return base.slice(0, Math.max(0, count));
      }
      case "offset": {
        const base = await followCollectionPort(ctx, nodeId, "collection", "offset.collection");
        const count = requireNumber(
          resolveLiteralOrThrow(ctx, nodeId, "count", "offset.count"),
          "offset.count",
        );
        return base.slice(Math.max(0, count));
      }
      case "project": {
        const base = await followCollectionPort(ctx, nodeId, "collection", "project.collection");
        const columnsRaw = requireString(
          resolveLiteralOrThrow(ctx, nodeId, "columns", "project.columns"),
          "project.columns",
        );
        return projectRows(base, columnsRaw);
      }
      case "group": {
        const base = [...(await followCollectionPort(ctx, nodeId, "collection", "group.collection"))];
        const columnName = requireString(
          resolveLiteralOrThrow(ctx, nodeId, "column", "group.column"),
          "group.column",
        );
        const directionRaw = requireString(
          resolveLiteralOrThrow(ctx, nodeId, "direction", "group.direction"),
          "group.direction",
        ).toLowerCase();
        const sign = directionRaw === "desc" ? -1 : 1;
        base.sort((a, b) => {
          const av = rowColumn(a, columnName);
          const bv = rowColumn(b, columnName);
          if (av === bv) return 0;
          if (av == null) return 1;
          if (bv == null) return -1;
          return av < bv ? -sign : sign;
        });
        return base;
      }
      case "search": {
        const base = await followCollectionPort(ctx, nodeId, "collection", "search.collection");
        const queryRaw = resolveLiteralOrThrow(ctx, nodeId, "query", "search.query");
        const query = requireString(queryRaw, "search.query");
        if (!ctx.host.textSearch) {
          throw new Error('Node type "search" requires ExecutionHost.textSearch');
        }
        return await ctx.host.textSearch(base, query);
      }
      case "traverse": {
        const base = await followCollectionPort(ctx, nodeId, "collection", "traverse.collection");
        const association = requireString(
          resolveLiteralOrThrow(ctx, nodeId, "association", "traverse.association"),
          "traverse.association",
        );
        const direction = requireNumber(
          resolveLiteralOrThrow(ctx, nodeId, "direction", "traverse.direction"),
          "traverse.direction",
        );
        if (direction !== 0 && direction !== 1) {
          throw new Error("traverse.direction must be 0 or 1");
        }
        const edgePropertyRaw = resolveLiteralOrThrow(
          ctx,
          nodeId,
          "edge_property",
          "traverse.edge_property",
        );
        const edgeEqualsRaw = resolveLiteralOrThrow(
          ctx,
          nodeId,
          "edge_equals",
          "traverse.edge_equals",
        );
        const edgeProperty =
          edgePropertyRaw === null || edgePropertyRaw === undefined
            ? null
            : requireString(edgePropertyRaw, "traverse.edge_property");
        const edgeEqualsSet = edgeEqualsRaw !== null && edgeEqualsRaw !== undefined;

        const seen = new Set<string>();
        const out: ExecutionRow[] = [];
        for (const source of base) {
          const targets = await ctx.host.traverse(
            source.id,
            association,
            direction as 0 | 1,
            edgeProperty,
            edgeEqualsSet ? edgeEqualsRaw : undefined,
          );
          for (const t of targets) {
            if (seen.has(t.id)) continue;
            seen.add(t.id);
            out.push(t);
          }
        }
        return out;
      }
      default: {
        if (isGraphBackedNodeType(node.type, ctx.registry)) {
          return evalCompositeCollectionPort(ctx, nodeId, outputPort);
        }
        throw new Error(`Unsupported collection node type "${node.type}"`);
      }
    }
  } finally {
    ctx.visiting.delete(nodeId);
  }
}

export function resultFromRows(rows: ExecutionRow[]): {
  columns: string[];
  rows: Record<string, unknown>[];
} {
  if (rows.length === 0) {
    return { columns: ["id"], rows: [] };
  }
  const propKeys = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row.properties)) {
      propKeys.add(key);
    }
  }
  const columns = ["id", ...[...propKeys].sort()];
  const outRows = rows.map((row) => {
    const record: Record<string, unknown> = { id: row.id };
    for (const key of propKeys) {
      record[key] = row.properties[key];
    }
    return record;
  });
  return { columns, rows: outRows };
}
