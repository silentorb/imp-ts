/**
 * Bind semantic path tokens: resolve via ontology then desugar to traverse/project.
 * Spec: imp-spec/docs/packages/imp-pathing/semantic-paths.md
 */

import type { DesugarPathOptions, DesugarPathResult } from "./desugar"
import { desugarPath } from "./desugar"
import type { PathOntology, ResolvedPathStep } from "./resolve"
import { resolveSemanticPath } from "./resolve"

export type BindSemanticPathOptions = DesugarPathOptions & {
  ontology: PathOntology
  startType: string
}

export type BindSemanticPathResult = DesugarPathResult & {
  steps: ResolvedPathStep[]
}

/**
 * Resolve untagged tokens then desugar to an Imp graph fragment.
 */
export function bindSemanticPath(
  tokens: readonly string[],
  options: BindSemanticPathOptions,
): BindSemanticPathResult {
  const { ontology, startType, ...desugarOptions } = options
  const steps = resolveSemanticPath(tokens, ontology, startType)
  const fragment = desugarPath(steps, desugarOptions)
  return { ...fragment, steps }
}
