# imp-spec

Core Imp graph and library **TypeScript type interfaces**. No runtime logic.

| Spec | Types |
| --- | --- |
| [`docs/features/graph-model.md`](../../docs/features/graph-model.md) | `Graph`, `Node`, `Edge`, ports, signal types |
| [`docs/features/node-libraries.md`](../../docs/features/node-libraries.md) | `NodeType`, `NodeLibrary` |

Types in `src/` must match those specs and are regenerable from them.

```ts
import type {
  Graph,
  Node,
  Edge,
  Port,
  Ports,
  SignalType,
  NodeType,
  NodeLibrary,
} from "imp-spec"
```
