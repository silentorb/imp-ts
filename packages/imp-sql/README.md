# imp-sql

Lower Imp graphs (core boundary nodes + `imp-collection-transforms`) to SQL via [Kysely](https://kysely.dev/).

```ts
import { graphToKysely, compileSql } from "imp-sql"

const query = graphToKysely(graph, { registry, schema: { table: "items" } })
const { sql, parameters } = compileSql(query)
```

See [`docs/features/sql.md`](../../docs/features/sql.md).
