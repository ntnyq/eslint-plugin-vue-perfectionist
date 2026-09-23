import { meta } from './meta.ts'
import { callbackStyle } from './rules/callback-style.ts'
import { componentPropTypes } from './rules/component-prop-types.ts'
import { consistentTemplateRefName } from './rules/consistent-template-ref-name.ts'
import { defineMacrosNewline } from './rules/define-macros-newline.ts'
import { preferRefPattern } from './rules/prefer-ref-pattern.ts'
import { requireComponentProps } from './rules/require-component-props.ts'
import { sortScriptSetup } from './rules/sort-script-setup.ts'
import type { ESLint } from 'eslint'
import type { VuePerfectionistPlugin } from './types/index.ts'

export const plugin: VuePerfectionistPlugin = {
  meta,
  // typescript-eslint still exposes deprecated context methods in its types.
  // Our rules use only the shared sourceCode/report API, exercised with ESLint 10.
  rules: {
    'callback-style': callbackStyle,
    'component-prop-types': componentPropTypes,
    'consistent-template-ref-name': consistentTemplateRefName,
    'define-macros-newline': defineMacrosNewline,
    'prefer-ref-pattern': preferRefPattern,
    'require-component-props': requireComponentProps,
    'sort-script-setup': sortScriptSetup,
  } as unknown as NonNullable<ESLint.Plugin['rules']>,
}
