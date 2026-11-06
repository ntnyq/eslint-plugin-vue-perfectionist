import type { Ref } from 'vue'

export interface Page {
  state: Ref<() => void>
  submit?: (() => Ref<string>) | null
  mixed: string | (() => void)
  uncertain: unknown
  untyped: any
}

export declare function usePage(): Page
export declare function useAsyncPage(): Promise<Page>
export declare function useGenericPage<T>(value: T): { value: T; submit(): void }
export declare function debounce(fn: () => void): () => void
export declare const callable: (() => void) & { description: string }
export declare const state: Ref<() => void>
export declare const submit: (() => Ref<string>) | undefined
export { usePage as default }
