import { meta } from './meta.ts'
import { callbackStyle } from './rules/callback-style.ts'
import { defineMacrosNewline } from './rules/define-macros-newline.ts'
import { preferRefPattern } from './rules/prefer-ref-pattern.ts'
import { sortScriptSetup } from './rules/sort-script-setup.ts'
import type { ESLint } from 'eslint'
import type { VuePerfectionistPlugin } from './types/index.ts'

export const plugin: VuePerfectionistPlugin = {
  meta,
  // typescript-eslint still exposes deprecated context methods in its types.
  // Our rules use only the shared sourceCode/report API, exercised with ESLint 10.
  rules: {
    'callback-style': callbackStyle,
    'define-macros-newline': defineMacrosNewline,
    'prefer-ref-pattern': preferRefPattern,
    'sort-script-setup': sortScriptSetup,
  } as unknown as NonNullable<ESLint.Plugin['rules']>,
}
