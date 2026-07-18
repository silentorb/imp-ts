# imp-react-flow

Bidirectional converters between Imp graphs and [React Flow](https://reactflow.dev/) (`@xyflow/react`) node/edge arrays.

Imp stays free of layout/UI fields. Converters stash Imp `InputValues` on React Flow `node.data.inputValues` so instance literals round-trip. Port templates come from `NodeType` catalogs / the registry.

```ts
import type { Graph } from "imp-spec"
import { impToReactFlow, reactFlowToImp } from "imp-react-flow"

const { nodes, edges } = impToReactFlow(graph)
const again = reactFlowToImp(nodes, edges)
```

See [`docs/features/react-flow.md`](../../docs/features/react-flow.md).
