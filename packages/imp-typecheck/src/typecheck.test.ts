import { describe, expect, test } from "bun:test"
import {
  concreteType,
  coreNodeLibrary,
  type Graph,
  type GraphTypeLibrary,
} from "imp-core-types"
import { collectionTransformsLibrary } from "imp-collection-transforms"
import {
  createRegistry,
  getGraphType,
  loadGraphTypeLibrary,
  loadLibrary,
  loadTypeConstraintLibrary,
} from "imp-registry"
import {
  checkGraph,
  checkGraphImplements,
  instantiateNodeType,
  resolveImplementation,
  resolveTypeArgs,
  signalTypeMatches,
  unify,
} from "./index"
import type { NodeLibrary } from "imp-core-types"
import { dispatchImplementation } from "imp-core-types"

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
})

describe("instantiateNodeType", () => {
  test("substitutes type parameters", () => {
    const nodeType = coreNodeLibrary.types.input
    const instantiated = instantiateNodeType(nodeType, [concreteType("string")])
    expect(instantiated.outputs.value?.type).toEqual(concreteType("string"))
    expect(instantiated.typeParams).toBeUndefined()
  })
})

describe("checkGraph", () => {
  test("accepts filter wired to input boundary", () => {
    const registry = loadLibrary(
      loadLibrary(createRegistry(), coreNodeLibrary),
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

    expect(checkGraph(graph, registry)).toEqual([])
  })

  test("reports edge type mismatch", () => {
    const registry = loadLibrary(
      loadLibrary(createRegistry(), coreNodeLibrary),
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

    const errors = checkGraph(graph, registry)
    expect(errors.length).toBeGreaterThan(0)
  })
})

describe("implementation dispatch", () => {
  const castLibrary: NodeLibrary = {
    id: "example.cast",
    types: {
      cast: {
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
    },
  }

  test("signalTypeMatches treats any as wildcard", () => {
    expect(signalTypeMatches(concreteType("any"), concreteType("string"))).toBe(true)
    expect(signalTypeMatches(concreteType("string"), concreteType("number"))).toBe(false)
  })

  test("resolveImplementation uses universal default", () => {
    const registry = loadLibrary(
      loadLibrary(createRegistry(), coreNodeLibrary),
      collectionTransformsLibrary,
    )
    const graph: Graph = {
      nodes: {
        in: { id: "in", type: "input", typeArgs: [concreteType("any")], inputs: {} },
        f: { id: "f", type: "filter", inputs: {} },
      },
      edges: {
        e1: {
          from: { node: "in", port: "value" },
          to: { node: "f", port: "collection" },
        },
      },
    }
    expect(resolveImplementation(graph, "f", registry)).toBe("filter")
  })

  test("resolveImplementation dispatches on inferred type arg", () => {
    const registry = loadLibrary(
      loadLibrary(loadLibrary(createRegistry(), coreNodeLibrary), castLibrary),
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
    expect(resolveTypeArgs(graph, "c", registry)).toEqual([concreteType("number")])
    expect(resolveImplementation(graph, "c", registry)).toBe("cast_number")
  })

  test("resolveImplementation uses dispatch default", () => {
    const registry = loadLibrary(
      loadLibrary(loadLibrary(createRegistry(), coreNodeLibrary), castLibrary),
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
    expect(resolveImplementation(graph, "c", registry)).toBe("cast_any")
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
    types: {
      identity: {
        id: "identity",
        typeParams: [{ id: "T", bounds: ["Scalar"] }],
        inputs: {
          value: { id: "value", type: { param: "T" } },
        },
        outputs: {
          value: { id: "value", type: { param: "T" } },
        },
      },
    },
  }

  function registryWithBounds() {
    return loadTypeConstraintLibrary(
      loadLibrary(loadLibrary(createRegistry(), coreNodeLibrary), identityLibrary),
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
    expect(checkGraph(graph, registry)).toEqual([])
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
    const errors = checkGraph(graph, registry)
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
    expect(checkGraph(graph, registry)).toEqual([])
  })

  test("reports unknown bound id", () => {
    const badLibrary: NodeLibrary = {
      id: "example.bad",
      types: {
        bad: {
          id: "bad",
          typeParams: [{ id: "T", bounds: ["Missing"] }],
          inputs: { value: { id: "value", type: { param: "T" } } },
          outputs: { value: { id: "value", type: { param: "T" } } },
        },
      },
    }
    const registry = loadLibrary(
      loadLibrary(createRegistry(), coreNodeLibrary),
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
    const errors = checkGraph(graph, registry)
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
      types: {
        passthrough: {
          id: "passthrough",
          typeParams: [{ id: "T", bounds: ["StringCollection"] }],
          inputs: {
            collection: { id: "collection", type: { param: "T" } },
          },
          outputs: {
            collection: { id: "collection", type: { param: "T" } },
          },
        },
      },
    }
    const registry = loadTypeConstraintLibrary(
      loadLibrary(
        loadLibrary(createRegistry(), coreNodeLibrary),
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
    expect(checkGraph(graph, registry)).toEqual([])
  })
})

describe("checkGraphImplements", () => {
  const graphTypeLibrary: GraphTypeLibrary = {
    id: "example.graph-types",
    types: {
      passthrough: {
        id: "passthrough",
        typeParams: [{ id: "T" }],
        inputs: {
          rows: {
            id: "rows",
            type: { id: "collection", args: [{ param: "T" }] },
          },
        },
        outputs: {
          rows: {
            id: "rows",
            type: { id: "collection", args: [{ param: "T" }] },
          },
        },
      },
    },
  }

  test("loads graph types into registry", () => {
    const registry = loadGraphTypeLibrary(createRegistry(), graphTypeLibrary)
    expect(getGraphType(registry, "passthrough")?.id).toBe("passthrough")
  })
})
