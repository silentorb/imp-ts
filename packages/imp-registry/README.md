# imp-registry

Load Imp **`NodeLibrary`** values and look up **`NodeType`**s by id.

Library packages implement [`NodeLibrary`](https://github.com/silentorb/imp-spec/blob/main/docs/packages/imp-core-types/node-libraries.md) from `imp-core-types` and do **not** depend on this package. Pass library objects you already have into `loadLibrary`.

```ts
import type { NodeLibrary } from "imp-core-types"
import { createRegistry, loadLibrary, getNodeType } from "imp-registry"

const registry = loadLibrary(createRegistry(), library)
getNodeType(registry, "add")
```

Type definitions (`types` on a `NodeLibrary` or an Imp file) share one global namespace; `loadImpFile` merges an Imp file's `types` and `definitions` (see [`imp-file`](../imp-file/)).

See [`imp-spec` registry](https://github.com/silentorb/imp-spec/blob/main/docs/packages/imp-registry/registry.md).
