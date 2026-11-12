/** Fixed core subtype relation. Spec: imp-spec/docs/packages/imp-typecheck/type-system.md */

/** Direct subtype → immediate supertype. */
const DIRECT_SUPERTYPE: Readonly<Record<string, string>> = {
  list: "collection",
}

export function isSubtypeId(subId: string, superId: string): boolean {
  if (subId === superId) return true
  return DIRECT_SUPERTYPE[subId] === superId
}
