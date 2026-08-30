# imp-sql

Lower Imp graphs (core boundary nodes + `imp-collection-transforms` + `imp-pathing`) to SQL via [Kysely](https://kysely.dev/).

```ts
import { graphToKysely, compileSql } from "imp-sql"

const query = graphToKysely(graph, { registry, schema: { table: "items" } })
const { sql, parameters } = compileSql(query)
```

See [`imp-spec` sql](../../imp-spec/docs/packages/imp-sql/sql.md).
