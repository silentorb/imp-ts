# imp-registry

Load Imp **`NodeLibrary`** values and look up **`NodeType`**s by id.

Library packages implement [`NodeLibrary`](../../imp-spec/docs/packages/imp-core-types/node-libraries.md) from `imp-core-types` and do **not** depend on this package. Pass library objects you already have into `loadLibrary`.

```ts
import type { NodeLibrary } from "imp-core-types"
import { createRegistry, loadLibrary, getNodeType } from "imp-registry"

const registry = loadLibrary(createRegistry(), library)
getNodeType(registry, "add")
```

See [`imp-spec` registry](../../imp-spec/docs/packages/imp-registry/registry.md).
