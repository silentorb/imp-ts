# imp-registry

Load Imp **`NodeLibrary`** values and look up **`NodeType`**s by id.

Library packages implement [`NodeLibrary`](../../docs/features/node-libraries.md) from `imp-spec` and do **not** depend on this package. Pass library objects you already have into `loadLibrary`.

```ts
import type { NodeLibrary } from "imp-spec"
import { createRegistry, loadLibrary, getNodeType } from "imp-registry"

const registry = loadLibrary(createRegistry(), library)
getNodeType(registry, "add")
```

See [`docs/features/registry.md`](../../docs/features/registry.md).
