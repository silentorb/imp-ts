# imp-spec

Core Imp graph **TypeScript type interfaces**. No runtime logic.

The language-agnostic data model lives in [`docs/features/graph-model.md`](../../docs/features/graph-model.md). Types in `src/` must match that spec and are regenerable from it.

```ts
import type { Graph, Node, Edge } from "imp-spec"
```
