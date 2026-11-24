import { describe, expect, test } from "bun:test"
import {
  collectionOf,
  concreteType,
  coreNodeLibrary,
  listOf,
  setOf,
  type Graph,
  type NodeLibrary,
} from "imp-core-types"
import { collectionTransformsLibrary } from "imp-collection-transforms"
import {
  createRegistry,
  loadGraphLibrary,
  loadNodeLibrary,
  loadTypeConstraintLibrary,
  getNodeDefinition,
} from "imp-registry"
import {
  assignable,
  checkGraph,
  checkDefinition,
  instantiateNodeDefinition,
  resolveImplementation,
  resolveTypeArgs,
  signalTypeMatches,
  unify,
} from "./index"
import {
  dispatchImplementation,
  graphSource,
  layeredNodes,
  nodeMapProvider,
} from "imp-core-types"

function coreDef(id: string) {
  return coreNodeLibrary.definitions.find((entry) => entry.id === id)!
}

describe("unify", () => {
  test("unifies matching concrete types", () => {
    const result = unify(concreteType("boolean"), concreteType("boolean"))
    expect(result.ok).toBe(true)
  })

  test("any absorbs other types", () => {
    const result = unify(concreteType("any"), concreteType("string"))
    expect(result.ok).toBe(true)
  })

  test("reports mismatch", () => {
    const result = unify(concreteType("string"), concreteType("number"))
    expect(result.ok).toBe(false)
  })

  test("does not unify list with collection by equality", () => {
    const result = unify(listOf(concreteType("string")), collectionOf(concreteType("string")))
    expect(result.ok).toBe(false)
  })
})

describe("assignable", () => {
  test("list is assignable to collection with matching args", () => {
    const result = assignable(
      listOf(concreteType("string")),
      collectionOf(concreteType("string")),
    )
    expect(result.ok).toBe(true)
  })

  test("collection is not assignable to list", () => {
    const result = assignable(
      collectionOf(concreteType("string")),
      listOf(concreteType("string")),
    )
    expect(result.ok).toBe(false)
  })

  test("list to collection requires invariant args", () => {
    const result = assignable(
      listOf(concreteType("string")),
      collectionOf(concreteType("number")),
    )
    expect(result.ok).toBe(false)
  })

  test("set is assignable to collection with matching args", () => {
    const result = assignable(
      setOf(concreteType("string")),
      collectionOf(concreteType("string")),
    )
    expect(result.ok).toBe(true)
  })

  test("set is not assignable to list", () => {
    const result = assignable(
      setOf(concreteType("string")),
      listOf(concreteType("string")),
    )
    expect(result.ok).toBe(false)
  })
})

describe("instantiateNodeDefinition", () => {
  test("substitutes type parameters", () => {
    const definition = coreDef("input")
    const instantiated = instantiateNodeDefinition(definition, [concreteType("string")])
    expect(instantiated.outputs.value?.type).toEqual(concreteType("string"))
    expect(instantiated.typeParams).toBeUndefined()
  })
})

describe("checkGraph", () => {
  test("accepts list input wired to filter (list overload)", () => {
    const registry = loadNodeLibrary(
      loadNodeLibrary(createRegistry(), coreNodeLibrary),
      collectionTransformsLibrary,
    )

    const graph: Graph = {
      nodes: {
        in: {
          id: "in",
          type: "input",
          typeArgs: [listOf(concreteType("any"))],
          inputs: {},
        },
        pred: { id: "pred", type: "literal", inputs: { value: true } },
        f: { id: "f", type: "filter", inputs: {} },
      },
      edges: {
        e1: {
          from: { node: "in", port: "value" },
          to: { node: "f", port: "collection" },
        },
        e2: {
          from: { node: "pred", port: "value" },
          to: { node: "f", port: "predicate" },
        },
      },
    }

    expect(checkGraph(graphSource(graph), registry)).toEqual([])
  })

  test("accepts list → filter → limit via list overload", () => {
    const registry = loadNodeLibrary(
      loadNodeLibrary(createRegistry(), coreNodeLibrary),
      collectionTransformsLibrary,
    )

    const graph: Graph = {
      nodes: {
        in: {
          id: "in",
          type: "input",
          typeArgs: [listOf(concreteType("any"))],
          inputs: {},
        },
        pred: { id: "pred", type: "literal", inputs: { value: true } },
        f: { id: "f", type: "filter", inputs: {} },
        lim: { id: "lim", type: "limit", inputs: { count: 10 } },
      },
      edges: {
        e1: {
          from: { node: "in", port: "value" },
          to: { node: "f", port: "collection" },
        },
        e2: {
          from: { node: "pred", port: "value" },
          to: { node: "f", port: "predicate" },
        },
        e3: {
          from: { node: "f", port: "collection" },
          to: { node: "lim", port: "collection" },
        },
      },
    }

    expect(checkGraph(graphSource(graph), registry)).toEqual([])
  })

  test("rejects set → filter → limit", () => {
    const registry = loadNodeLibrary(
      loadNodeLibrary(createRegistry(), coreNodeLibrary),
      collectionTransformsLibrary,
    )

    const graph: Graph = {
      nodes: {
        in: {
          id: "in",
          type: "input",
          typeArgs: [setOf(concreteType("any"))],
          inputs: {},
        },
        pred: { id: "pred", type: "literal", inputs: { value: true } },
        f: { id: "f", type: "filter", inputs: {} },
        lim: { id: "lim", type: "limit", inputs: { count: 10 } },
      },
      edges: {
        e1: {
          from: { node: "in", port: "value" },
          to: { node: "f", port: "collection" },
        },
        e2: {
          from: { node: "pred", port: "value" },
          to: { node: "f", port: "predicate" },
        },
        e3: {
          from: { node: "f", port: "collection" },
          to: { node: "lim", port: "collection" },
        },
      },
    }

    const errors = checkGraph(graphSource(graph), registry)
    expect(errors.length).toBeGreaterThan(0)
  })

  test("accepts set → filter → project via set overload", () => {
    const registry = loadNodeLibrary(
      loadNodeLibrary(createRegistry(), coreNodeLibrary),
      collectionTransformsLibrary,
    )

    const graph: Graph = {
      nodes: {
        in: {
          id: "in",
          type: "input",
          typeArgs: [setOf(concreteType("any"))],
          inputs: {},
        },
        pred: { id: "pred", type: "literal", inputs: { value: true } },
        f: { id: "f", type: "filter", inputs: {} },
        p: { id: "p", type: "project", inputs: { columns: "id" } },
      },
      edges: {
        e1: {
          from: { node: "in", port: "value" },
          to: { node: "f", port: "collection" },
        },
        e2: {
          from: { node: "pred", port: "value" },
          to: { node: "f", port: "predicate" },
        },
        e3: {
          from: { node: "f", port: "collection" },
          to: { node: "p", port: "collection" },
        },
      },
    }

    expect(checkGraph(graphSource(graph), registry)).toEqual([])
  })

  test("rejects collection input wired to filter", () => {
    const registry = loadNodeLibrary(
      loadNodeLibrary(createRegistry(), coreNodeLibrary),
      collectionTransformsLibrary,
    )

    const graph: Graph = {
      nodes: {
        in: {
          id: "in",
          type: "input",
          typeArgs: [collectionOf(concreteType("any"))],
          inputs: {},
        },
        pred: { id: "pred", type: "literal", inputs: { value: true } },
        f: { id: "f", type: "filter", inputs: {} },
      },
      edges: {
        e1: {
          from: { node: "in", port: "value" },
          to: { node: "f", port: "collection" },
        },
        e2: {
          from: { node: "pred", port: "value" },
          to: { node: "f", port: "predicate" },
        },
      },
    }

    const errors = checkGraph(graphSource(graph), registry)
    expect(errors.some((e) => e.message.includes("no matching overload"))).toBe(true)
  })

  test("reports ambiguous filter when input is any", () => {
    const registry = loadNodeLibrary(
      loadNodeLibrary(createRegistry(), coreNodeLibrary),
      collectionTransformsLibrary,
    )

    const graph: Graph = {
      nodes: {
        in: {
          id: "in",
          type: "input",
          typeArgs: [concreteType("any")],
          inputs: {},
        },
        pred: { id: "pred", type: "literal", inputs: { value: true } },
        f: { id: "f", type: "filter", inputs: {} },
      },
      edges: {
        e1: {
          from: { node: "in", port: "value" },
          to: { node: "f", port: "collection" },
        },
        e2: {
          from: { node: "pred", port: "value" },
          to: { node: "f", port: "predicate" },
        },
      },
    }

    const errors = checkGraph(graphSource(graph), registry)
    expect(errors.some((e) => e.message.includes("ambiguous overload"))).toBe(true)
  })

  test("rejects collection input wired to list sort port", () => {
    const registry = loadNodeLibrary(
      loadNodeLibrary(createRegistry(), coreNodeLibrary),
      collectionTransformsLibrary,
    )

    const graph: Graph = {
      nodes: {
        in: {
          id: "in",
          type: "input",
          typeArgs: [collectionOf(concreteType("any"))],
          inputs: {},
        },
        sort: {
          id: "sort",
          type: "sort",
          inputs: { column: "name", direction: "asc" },
        },
      },
      edges: {
        e1: {
          from: { node: "in", port: "value" },
          to: { node: "sort", port: "collection" },
        },
      },
    }

    const errors = checkGraph(graphSource(graph), registry)
    expect(errors.some((e) => e.portId === "collection")).toBe(true)
  })

  test("reports edge type mismatch", () => {
    const registry = loadNodeLibrary(
      loadNodeLibrary(createRegistry(), coreNodeLibrary),
      collectionTransformsLibrary,
    )

    const graph: Graph = {
      nodes: {
        lit: { id: "lit", type: "literal", inputs: { value: "x" } },
        f: { id: "f", type: "filter", inputs: {} },
      },
      edges: {
        e1: {
          from: { node: "lit", port: "value" },
          to: { node: "f", port: "collection" },
        },
      },
    }

    const errors = checkGraph(graphSource(graph), registry)
    expect(errors.length).toBeGreaterThan(0)
  })
})

describe("implementation dispatch", () => {
  const castLibrary: NodeLibrary = {
    id: "example.cast",
    definitions: [
      {
        id: "cast",
        typeParams: [{ id: "T" }],
        implementation: dispatchImplementation(
          [
            { match: concreteType("string"), implementation: "cast_string" },
            { match: concreteType("number"), implementation: "cast_number" },
          ],
          { default: "cast_any" },
        ),
        inputs: {
          value: { id: "value", type: { param: "T" } },
        },
        outputs: {
          value: { id: "value", type: concreteType("string") },
        },
      },
    ],
  }

  test("signalTypeMatches treats any as wildcard", () => {
    expect(signalTypeMatches(concreteType("any"), concreteType("string"))).toBe(true)
    expect(signalTypeMatches(concreteType("string"), concreteType("number"))).toBe(false)
  })

  test("signalTypeMatches allows subtype against supertype pattern", () => {
    expect(
      signalTypeMatches(collectionOf(concreteType("string")), listOf(concreteType("string"))),
    ).toBe(true)
    expect(
      signalTypeMatches(listOf(concreteType("string")), collectionOf(concreteType("string"))),
    ).toBe(false)
  })

  test("resolveImplementation uses selected list overload id", () => {
    const registry = loadNodeLibrary(
      loadNodeLibrary(createRegistry(), coreNodeLibrary),
      collectionTransformsLibrary,
    )
    const graph: Graph = {
      nodes: {
        in: { id: "in", type: "input", typeArgs: [listOf(concreteType("any"))], inputs: {} },
        f: { id: "f", type: "filter", inputs: {} },
      },
      edges: {
        e1: {
          from: { node: "in", port: "value" },
          to: { node: "f", port: "collection" },
        },
      },
    }
    expect(resolveImplementation(graphSource(graph), "f", registry)).toBe("filter_list")
  })

  test("resolveImplementation uses selected set overload id", () => {
    const registry = loadNodeLibrary(
      loadNodeLibrary(createRegistry(), coreNodeLibrary),
      collectionTransformsLibrary,
    )
    const graph: Graph = {
      nodes: {
        in: { id: "in", type: "input", typeArgs: [setOf(concreteType("any"))], inputs: {} },
        f: { id: "f", type: "filter", inputs: {} },
      },
      edges: {
        e1: {
          from: { node: "in", port: "value" },
          to: { node: "f", port: "collection" },
        },
      },
    }
    expect(resolveImplementation(graphSource(graph), "f", registry)).toBe("filter_set")
  })

  test("resolveImplementation dispatches on inferred type arg", () => {
    const registry = loadNodeLibrary(
      loadNodeLibrary(loadNodeLibrary(createRegistry(), coreNodeLibrary), castLibrary),
      collectionTransformsLibrary,
    )
    const graph: Graph = {
      nodes: {
        in: { id: "in", type: "input", typeArgs: [concreteType("number")], inputs: {} },
        c: { id: "c", type: "cast", inputs: {} },
      },
      edges: {
        e1: {
          from: { node: "in", port: "value" },
          to: { node: "c", port: "value" },
        },
      },
    }
    expect(resolveTypeArgs(graphSource(graph), "c", registry)).toEqual([concreteType("number")])
    expect(resolveImplementation(graphSource(graph), "c", registry)).toBe("cast_number")
  })

  test("resolveImplementation uses dispatch default", () => {
    const registry = loadNodeLibrary(
      loadNodeLibrary(loadNodeLibrary(createRegistry(), coreNodeLibrary), castLibrary),
      collectionTransformsLibrary,
    )
    const graph: Graph = {
      nodes: {
        in: { id: "in", type: "input", typeArgs: [concreteType("boolean")], inputs: {} },
        c: { id: "c", type: "cast", inputs: {} },
      },
      edges: {
        e1: {
          from: { node: "in", port: "value" },
          to: { node: "c", port: "value" },
        },
      },
    }
    expect(resolveImplementation(graphSource(graph), "c", registry)).toBe("cast_any")
  })
})

describe("type param bounds", () => {
  const scalarConstraintLibrary = {
    id: "example.constraints",
    constraints: {
      Scalar: {
        id: "Scalar",
        members: [concreteType("string"), concreteType("number")],
      },
    },
  }

  const identityLibrary: NodeLibrary = {
    id: "example.identity",
    definitions: [
      {
        id: "identity",
        typeParams: [{ id: "T", bounds: ["Scalar"] }],
        inputs: {
          value: { id: "value", type: { param: "T" } },
        },
        outputs: {
          value: { id: "value", type: { param: "T" } },
        },
      },
    ],
  }

  function registryWithBounds() {
    return loadTypeConstraintLibrary(
      loadNodeLibrary(loadNodeLibrary(createRegistry(), coreNodeLibrary), identityLibrary),
      scalarConstraintLibrary,
    )
  }

  test("accepts type arg that satisfies bound", () => {
    const registry = registryWithBounds()
    const graph: Graph = {
      nodes: {
        in: { id: "in", type: "input", typeArgs: [concreteType("number")], inputs: {} },
        id: { id: "id", type: "identity", inputs: {} },
      },
      edges: {
        e1: {
          from: { node: "in", port: "value" },
          to: { node: "id", port: "value" },
        },
      },
    }
    expect(checkGraph(graphSource(graph), registry)).toEqual([])
  })

  test("rejects type arg that violates bound", () => {
    const registry = registryWithBounds()
    const graph: Graph = {
      nodes: {
        in: { id: "in", type: "input", typeArgs: [concreteType("boolean")], inputs: {} },
        id: { id: "id", type: "identity", inputs: {} },
      },
      edges: {
        e1: {
          from: { node: "in", port: "value" },
          to: { node: "id", port: "value" },
        },
      },
    }
    const errors = checkGraph(graphSource(graph), registry)
    expect(errors.some((e) => e.message.includes("does not satisfy bound \"Scalar\""))).toBe(true)
  })

  test("any satisfies bound", () => {
    const registry = registryWithBounds()
    const graph: Graph = {
      nodes: {
        in: { id: "in", type: "input", typeArgs: [concreteType("any")], inputs: {} },
        id: { id: "id", type: "identity", inputs: {} },
      },
      edges: {
        e1: {
          from: { node: "in", port: "value" },
          to: { node: "id", port: "value" },
        },
      },
    }
    expect(checkGraph(graphSource(graph), registry)).toEqual([])
  })

  test("reports unknown bound id", () => {
    const badLibrary: NodeLibrary = {
      id: "example.bad",
      definitions: [
        {
          id: "bad",
          typeParams: [{ id: "T", bounds: ["Missing"] }],
          inputs: { value: { id: "value", type: { param: "T" } } },
          outputs: { value: { id: "value", type: { param: "T" } } },
        },
      ],
    }
    const registry = loadNodeLibrary(
      loadNodeLibrary(createRegistry(), coreNodeLibrary),
      badLibrary,
    )
    const graph: Graph = {
      nodes: {
        in: { id: "in", type: "input", typeArgs: [concreteType("number")], inputs: {} },
        bad: { id: "bad", type: "bad", inputs: {} },
      },
      edges: {
        e1: {
          from: { node: "in", port: "value" },
          to: { node: "bad", port: "value" },
        },
      },
    }
    const errors = checkGraph(graphSource(graph), registry)
    expect(errors.some((e) => e.message.includes("unknown type constraint \"Missing\""))).toBe(
      true,
    )
  })

  test("matches parametric member patterns", () => {
    const collectionConstraintLibrary = {
      id: "example.collection-constraints",
      constraints: {
        StringCollection: {
          id: "StringCollection",
          members: [{ id: "collection", args: [concreteType("string")] }],
        },
      },
    }
    const passthroughLibrary: NodeLibrary = {
      id: "example.passthrough",
      definitions: [
        {
          id: "passthrough",
          typeParams: [{ id: "T", bounds: ["StringCollection"] }],
          inputs: {
            collection: { id: "collection", type: { param: "T" } },
          },
          outputs: {
            collection: { id: "collection", type: { param: "T" } },
          },
        },
      ],
    }
    const registry = loadTypeConstraintLibrary(
      loadNodeLibrary(
        loadNodeLibrary(createRegistry(), coreNodeLibrary),
        passthroughLibrary,
      ),
      collectionConstraintLibrary,
    )
    const graph: Graph = {
      nodes: {
        in: {
          id: "in",
          type: "input",
          typeArgs: [{ id: "collection", args: [concreteType("string")] }],
          inputs: {},
        },
        p: { id: "p", type: "passthrough", inputs: {} },
      },
      edges: {
        e1: {
          from: { node: "in", port: "value" },
          to: { node: "p", port: "collection" },
        },
      },
    }
    expect(checkGraph(graphSource(graph), registry)).toEqual([])
  })
})

describe("checkDefinition", () => {
  test("validates graph-backed library entry", () => {
    const graphLibrary = {
      id: "example.graph-types",
      definitions: [
        {
          id: "passthrough",
          inputs: {
            rows: { id: "rows", type: { id: "collection" } },
          },
          outputs: {
            rows: { id: "rows", type: { id: "collection" } },
          },
          bindings: {
            inputs: { rows: "in_rows" },
            outputs: { rows: "out_rows" },
          },
          body: {
            nodes: {
              in_rows: {
                id: "in_rows",
                type: "input",
                typeArgs: [{ id: "collection" }],
                inputs: {},
              },
              out_rows: { id: "out_rows", type: "output", inputs: {} },
            },
            edges: {
              e1: {
                from: { node: "in_rows", port: "value" },
                to: { node: "out_rows", port: "value" },
              },
            },
          },
        },
      ],
    }

    const registry = loadGraphLibrary(
      loadNodeLibrary(createRegistry(), coreNodeLibrary),
      graphLibrary,
    )
    expect(getNodeDefinition(registry, "passthrough")?.id).toBe("passthrough")
    expect(checkDefinition(graphLibrary.definitions[0]!, registry)).toEqual([])
  })
})

describe("variadic ports", () => {
  function transformsRegistry() {
    return loadNodeLibrary(
      loadNodeLibrary(createRegistry(), coreNodeLibrary),
      collectionTransformsLibrary,
    )
  }

  test("accepts N-ary and with unique Edge.order", () => {
    const graph: Graph = {
      nodes: {
        a: { id: "a", type: "literal", inputs: { value: true } },
        b: { id: "b", type: "literal", inputs: { value: false } },
        c: { id: "c", type: "literal", inputs: { value: true } },
        and1: { id: "and1", type: "and", inputs: {} },
      },
      edges: {
        e0: {
          from: { node: "a", port: "value" },
          to: { node: "and1", port: "operands" },
          order: 0,
        },
        e1: {
          from: { node: "b", port: "value" },
          to: { node: "and1", port: "operands" },
          order: 1,
        },
        e2: {
          from: { node: "c", port: "value" },
          to: { node: "and1", port: "operands" },
          order: 2,
        },
      },
    }
    expect(checkGraph(graphSource(graph), transformsRegistry())).toEqual([])
  })

  test("rejects missing Edge.order on variadic target", () => {
    const graph: Graph = {
      nodes: {
        a: { id: "a", type: "literal", inputs: { value: true } },
        and1: { id: "and1", type: "and", inputs: {} },
      },
      edges: {
        e0: {
          from: { node: "a", port: "value" },
          to: { node: "and1", port: "operands" },
        },
      },
    }
    const errors = checkGraph(graphSource(graph), transformsRegistry())
    expect(errors.some((e) => e.message.includes("requires Edge.order"))).toBe(true)
  })

  test("rejects duplicate Edge.order on same variadic target", () => {
    const graph: Graph = {
      nodes: {
        a: { id: "a", type: "literal", inputs: { value: true } },
        b: { id: "b", type: "literal", inputs: { value: false } },
        and1: { id: "and1", type: "and", inputs: {} },
      },
      edges: {
        e0: {
          from: { node: "a", port: "value" },
          to: { node: "and1", port: "operands" },
          order: 0,
        },
        e1: {
          from: { node: "b", port: "value" },
          to: { node: "and1", port: "operands" },
          order: 0,
        },
      },
    }
    const errors = checkGraph(graphSource(graph), transformsRegistry())
    expect(errors.some((e) => e.message.includes("duplicate Edge.order"))).toBe(true)
  })

  test("rejects multiple edges on non-variadic input", () => {
    const graph: Graph = {
      nodes: {
        a: { id: "a", type: "literal", inputs: { value: true } },
        b: { id: "b", type: "literal", inputs: { value: false } },
        not1: { id: "not1", type: "not", inputs: {} },
      },
      edges: {
        e0: {
          from: { node: "a", port: "value" },
          to: { node: "not1", port: "value" },
        },
        e1: {
          from: { node: "b", port: "value" },
          to: { node: "not1", port: "value" },
        },
      },
    }
    const errors = checkGraph(graphSource(graph), transformsRegistry())
    expect(errors.some((e) => e.message.includes("non-variadic"))).toBe(true)
  })

  test("checkDefinition requires list boundary for variadic input", () => {
    const definition = {
      id: "fold_ops",
      inputs: {
        operands: {
          id: "operands",
          type: concreteType("boolean"),
          variadic: true,
        },
      },
      outputs: {
        value: { id: "value", type: concreteType("boolean") },
      },
      bindings: {
        inputs: { operands: "in_ops" },
        outputs: { value: "out_val" },
      },
      body: {
        nodes: {
          in_ops: {
            id: "in_ops",
            type: "input",
            typeArgs: [listOf(concreteType("boolean"))],
            inputs: {},
          },
          out_val: { id: "out_val", type: "output", inputs: {} },
        },
        edges: {},
      },
    }
    const registry = loadNodeLibrary(createRegistry(), coreNodeLibrary)
    const errors = checkDefinition(definition, registry)
    expect(errors.filter((e) => e.nodeId === "in_ops")).toEqual([])
  })
})

describe("graph sources", () => {
  const registry = () =>
    loadNodeLibrary(
      loadNodeLibrary(createRegistry(), coreNodeLibrary),
      collectionTransformsLibrary,
    )

  const doc: Graph = {
    nodes: { out: { id: "out", type: "output", inputs: {} } },
    edges: {
      e: { from: { node: "remote", port: "value" }, to: { node: "out", port: "value" } },
    },
  }

  test("reports an endpoint no provider resolves as unknown node", () => {
    const errors = checkGraph(graphSource(doc), registry())
    expect(
      errors.some((e) => e.nodeId === "remote" && e.message.includes("unknown node")),
    ).toBe(true)
  })

  test("checks a node from a layered provider like a local one", () => {
    const remote = nodeMapProvider({
      remote: { id: "remote", type: "literal", inputs: { value: 1 } },
    })
    const source = { ...graphSource(doc), nodes: layeredNodes(graphSource(doc).nodes, remote) }
    expect(checkGraph(source, registry())).toEqual([])
  })

  test("type-checks layered nodes through the registry", () => {
    const remote = nodeMapProvider({
      remote: { id: "remote", type: "not_registered", inputs: {} },
    })
    const source = { ...graphSource(doc), nodes: layeredNodes(graphSource(doc).nodes, remote) }
    const errors = checkGraph(source, registry())
    expect(errors.some((e) => e.nodeId === "remote" && e.message.includes("unknown NodeDefinition"))).toBe(true)
  })
})
