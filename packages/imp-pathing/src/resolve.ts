/**
 * Ontology-resolved semantic paths.
 * Spec: imp-spec/docs/packages/imp-pathing/semantic-paths.md
 */

/** Host binding for one type-scoped semantic token. */
export type OntologyPropertyBinding = {
  kind: "property"
  /** Logical column / property name for `column` / `project`. */
  name: string
}

export type OntologyRelationshipBinding = {
  kind: "relationship"
  association: string
  direction: 0 | 1
  /**
   * Type context for further path tokens (related node type).
   * Required when more path tokens follow; may be omitted for a terminal hop
   * (e.g. relational role with an open opposite endpoint).
   */
  nextType?: string
  edge_property?: string | null
  edge_equals?: unknown
}

export type OntologyBinding = OntologyPropertyBinding | OntologyRelationshipBinding

/**
 * Host-supplied ontology: type-scoped semantic token → property or relationship.
 * Must not guess kind at runtime; unknown / ambiguous tokens throw or return via resolve errors.
 */
export type PathOntology = {
  resolve(typeId: string, token: string): OntologyBinding
}

export type EdgePathStep = {
  kind: "edge"
  association: string
  direction: 0 | 1
  edge_property?: string | null
  edge_equals?: unknown
}

export type FieldPathStep = {
  kind: "field"
  name: string
}

export type ResolvedPathStep = EdgePathStep | FieldPathStep

export type ResolveSemanticPathError = {
  tokenIndex: number
  token: string
  typeId: string | null
  message: string
}

export class SemanticPathResolveError extends Error {
  readonly detail: ResolveSemanticPathError

  constructor(detail: ResolveSemanticPathError) {
    super(detail.message)
    this.name = "SemanticPathResolveError"
    this.detail = detail
  }
}

function isPropertyBinding(b: OntologyBinding): b is OntologyPropertyBinding {
  return b.kind === "property"
}

/**
 * Resolve untagged semantic tokens into ordered edge/field steps via a host ontology.
 *
 * Rules (v1): leading edges then trailing fields; no continuing after a property (scalar).
 */
export function resolveSemanticPath(
  tokens: readonly string[],
  ontology: PathOntology,
  startType: string,
): ResolvedPathStep[] {
  const steps: ResolvedPathStep[] = []
  let currentType: string | null = startType
  let endpoint: "nodes" | "scalar" = "nodes"

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!
    if (endpoint === "scalar" || currentType === null) {
      throw new SemanticPathResolveError({
        tokenIndex: i,
        token,
        typeId: currentType,
        message: `resolveSemanticPath: cannot continue after scalar endpoint at token "${token}" (index ${i})`,
      })
    }

    let binding: OntologyBinding
    try {
      binding = ontology.resolve(currentType, token)
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : `unknown token "${token}" in type "${currentType}"`
      throw new SemanticPathResolveError({
        tokenIndex: i,
        token,
        typeId: currentType,
        message: `resolveSemanticPath: ${message}`,
      })
    }

    if (isPropertyBinding(binding)) {
      steps.push({ kind: "field", name: binding.name })
      endpoint = "scalar"
      currentType = null
    } else {
      const hasMoreTokens = i < tokens.length - 1
      if (hasMoreTokens && !binding.nextType) {
        throw new SemanticPathResolveError({
          tokenIndex: i,
          token,
          typeId: currentType,
          message: `resolveSemanticPath: relationship "${token}" missing nextType`,
        })
      }
      const edge: EdgePathStep = {
        kind: "edge",
        association: binding.association,
        direction: binding.direction,
      }
      if (binding.edge_property !== undefined) {
        edge.edge_property = binding.edge_property
      }
      if (binding.edge_equals !== undefined) {
        edge.edge_equals = binding.edge_equals
      }
      steps.push(edge)
      currentType = binding.nextType ?? null
      endpoint = "nodes"
    }
  }

  return steps
}

/**
 * Build a map-backed PathOntology for tests and simple hosts.
 * Entries: typeId → token → binding.
 */
export function mapPathOntology(
  types: Readonly<Record<string, Readonly<Record<string, OntologyBinding>>>>,
): PathOntology {
  return {
    resolve(typeId: string, token: string): OntologyBinding {
      const table = types[typeId]
      if (!table) {
        throw new Error(`unknown type "${typeId}"`)
      }
      const binding = table[token]
      if (!binding) {
        throw new Error(`unknown token "${token}" in type "${typeId}"`)
      }
      return binding
    },
  }
}
