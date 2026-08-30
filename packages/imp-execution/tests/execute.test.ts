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
});
