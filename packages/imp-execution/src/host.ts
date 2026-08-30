/** Read-only execution host and sandbox capabilities. Spec: imp-spec/docs/packages/imp-execution/execution.md */

export interface ExecutionRow {
  id: string;
  properties: Record<string, unknown>;
  is_archived?: boolean;
}

/** Default-deny extension point for future effectful operators. */
export interface ExecutionCapabilities {
  read: boolean;
  write: boolean;
}

export const DEFAULT_EXECUTION_CAPABILITIES: ExecutionCapabilities = {
  read: true,
  write: false,
};

export interface ExecutionHost {
  listInputRows(): ExecutionRow[] | Promise<ExecutionRow[]>;
  traverse(
    sourceId: string,
    association: string,
    direction: 0 | 1,
    edgeProperty?: string | null,
    edgeEquals?: unknown,
  ): ExecutionRow[] | Promise<ExecutionRow[]>;
  /**
   * Declarative text search over a collection slice. Host defines heuristics
   * (ranking, fields, fuzzy match). Required when graphs use the `search` transform.
   */
  textSearch?(
    rows: ExecutionRow[],
    query: string,
  ): ExecutionRow[] | Promise<ExecutionRow[]>;
}

export interface ExecutionResult {
  columns: string[];
  rows: Record<string, unknown>[];
}
