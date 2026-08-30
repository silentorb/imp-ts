import { describe, expect, test } from "bun:test";
import { coreNodeLibrary } from "imp-core-types";
import { createRegistry, loadLibrary } from "imp-registry";
import { collectionTransformsLibrary } from "imp-collection-transforms";
import type { Graph } from "imp-core-types";
import { executeGraph } from "../src/execute";
import type { ExecutionHost, ExecutionRow } from "../src/host";

const registry = loadLibrary(
  loadLibrary(createRegistry(), coreNodeLibrary),
  collectionTransformsLibrary,
);

function passthroughGraph(): Graph {
  return {
    nodes: {
      in: { id: "in", type: "input", inputs: {} },
      out: { id: "out", type: "output", inputs: {} },
    },
    edges: {
      e1: { from: { node: "in", port: "value" }, to: { node: "out", port: "value" } },
    },
  };
}

describe("imp-execution", () => {
  test("executes input → output passthrough", async () => {
    const host: ExecutionHost = {
      listInputRows(): ExecutionRow[] {
        return [
          { id: "A", properties: { title: "Alpha" } },
          { id: "B", properties: { title: "Beta" } },
        ];
      },
      traverse() {
        return [];
      },
    };

    const result = await executeGraph(passthroughGraph(), { registry, host });
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]?.id).toBe("A");
  });

  test("rejects write capability grant", async () => {
    const host: ExecutionHost = {
      listInputRows: () => [],
      traverse: () => [],
    };
    await expect(
      executeGraph(passthroughGraph(), {
        registry,
        host,
        capabilities: { read: true, write: true },
      }),
    ).rejects.toThrow(/write capabilities/);
  });

  test("filter with not predicate excludes matching rows", async () => {
    const graph: Graph = {
      nodes: {
        in: { id: "in", type: "input", inputs: {} },
        col: { id: "col", type: "column", inputs: { name: "active" } },
        lit: { id: "lit", type: "literal", inputs: { value: true } },
        eq: { id: "eq", type: "equals", inputs: {} },
        not: { id: "not", type: "not", inputs: {} },
        filter: { id: "filter", type: "filter", inputs: {} },
        out: { id: "out", type: "output", inputs: {} },
      },
      edges: {
        e_col: { from: { node: "col", port: "value" }, to: { node: "eq", port: "left" } },
        e_lit: { from: { node: "lit", port: "value" }, to: { node: "eq", port: "right" } },
        e_eq: { from: { node: "eq", port: "value" }, to: { node: "not", port: "value" } },
        e_pred: {
          from: { node: "not", port: "value" },
          to: { node: "filter", port: "predicate" },
        },
        e_in: {
          from: { node: "in", port: "value" },
          to: { node: "filter", port: "collection" },
        },
        e_out: {
          from: { node: "filter", port: "collection" },
          to: { node: "out", port: "value" },
        },
      },
    };

    const host: ExecutionHost = {
      listInputRows(): ExecutionRow[] {
        return [
          { id: "A", properties: { active: true } },
          { id: "B", properties: { active: false } },
        ];
      },
      traverse: () => [],
    };

    const result = await executeGraph(graph, { registry, host });
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.id).toBe("B");
  });
});
