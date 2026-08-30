# imp-core-types

Core Imp graph and library **TypeScript type interfaces**, plus the core boundary `NodeLibrary`.

| Spec | Types / values |
| --- | --- |
| [`docs/features/graph-model.md`](../../docs/features/graph-model.md) | `Graph`, `Node`, `Edge`, ports, `InputValues`, `coreNodeLibrary` |
| [`docs/features/node-libraries.md`](../../docs/features/node-libraries.md) | `NodeType`, `NodeLibrary` |

Types in `src/` must match those specs and are regenerable from them.

```ts
import type {
  Graph,
  Node,
  Edge,
  Port,
  Ports,
  InputValues,
  SignalType,
  NodeType,
  NodeLibrary,
} from "imp-core-types"
import { coreNodeLibrary } from "imp-core-types"
```
