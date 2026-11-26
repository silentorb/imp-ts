/** Type definitions (named types). Authoritative spec: imp-spec/docs/packages/imp-core-types/type-definitions.md */

import type { TypeId, TypeParam } from "./graph"
import type { Type } from "./type"

/** `id<params> = type`: a transparent alias, e.g. `Audio = audio_mono | audio_stereo`. */
export interface TypeDefinition {
  id: TypeId
  params?: TypeParam[]
  type: Type
}
