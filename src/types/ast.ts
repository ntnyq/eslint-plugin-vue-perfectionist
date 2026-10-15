export interface CallIdentity {
  isUnbound: boolean
  /**
   * Identifier or dotted member name written at the call site.
   */
  localName: string
  /**
   * Classification name: default imports retain their local name for sorting.
   */
  name: string
  /**
   * Original runtime export name, including "default", when imported.
   */
  exportedName?: string
  source?: string
}
