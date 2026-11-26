# imp-file

Parse, validate and serialize **Imp files**: the one JSON shape for Imp content. A file may hold any mix of type definitions, node definitions (primitive or graph-backed), nodes and edges.

```ts
import { createRegistry, loadImpFile } from "imp-registry"
import { impFileGraphSource, parseImpFileJson } from "imp-file"
import { checkGraph } from "imp-typecheck"

const file = parseImpFileJson(text)
const registry = loadImpFile(createRegistry(), file) // types + definitions
const errors = checkGraph(impFileGraphSource(file), registry) // nodes + edges
```

See [`imp-spec` imp-files](https://github.com/silentorb/imp-spec/blob/main/docs/packages/imp-file/imp-files.md).
