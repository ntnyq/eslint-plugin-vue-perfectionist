import type { InjectionKey } from 'vue'

export const stringKey: InjectionKey<string> = Symbol('string')
export const numberKey: InjectionKey<number> = Symbol('number')
export const plainKey = Symbol('plain')
export const legacyKey = 'legacy'
export type ContextKey<T> = InjectionKey<T>
export { inject, provide } from 'vue'
export type { InjectionKey as ReexportedKey } from 'vue'
