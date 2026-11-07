export interface PreferDefineModelOptions {
  /**
   * Recognize passive VueUse useVModel calls. Overrides shared vueuse; defaults
   * to false when neither is configured.
   */
  vueuse?: boolean
}

export type PreferDefineModelMessageId = 'preferDefineModel'
