# imp-core-types

Core Imp graph and library **TypeScript type interfaces**, plus the core boundary `NodeLibrary`.

| Spec | Types / values |
| --- | --- |
| [`imp-spec` graph-model](https://github.com/silentorb/imp-spec/blob/main/docs/packages/imp-core-types/graph-model.md) | `Graph`, `Node`, `Edge`, ports, `InputValues`, `coreNodeLibrary` |
| [`imp-spec` node-libraries](https://github.com/silentorb/imp-spec/blob/main/docs/packages/imp-core-types/node-libraries.md) | `NodeType`, `NodeLibrary` |

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
