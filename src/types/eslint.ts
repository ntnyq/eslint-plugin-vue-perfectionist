import type { TSESLint } from '@typescript-eslint/utils'

/**
 * Shared ESLint source access, independent of any individual rule's options.
 */
export type SourceCode = Readonly<TSESLint.SourceCode>
