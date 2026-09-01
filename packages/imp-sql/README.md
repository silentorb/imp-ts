# imp-sql

**Imp Translator** — translates Imp graphs (core boundary nodes + `imp-collection-transforms` + `imp-pathing`) to SQL via [Kysely](https://kysely.dev/).

```ts
import { graphToKysely, compileSql } from "imp-sql"

const query = graphToKysely(graph, { registry, schema: { table: "items" } })
const { sql, parameters } = compileSql(query)
```

See [sql.md](../../docs/features/sql.md).
