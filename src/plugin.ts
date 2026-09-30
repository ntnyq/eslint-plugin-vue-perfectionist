import { meta } from './meta.ts'
import { callbackStyle } from './rules/callback-style.ts'
import { componentPropTypes } from './rules/component-prop-types.ts'
import { componentPropValues } from './rules/component-prop-values.ts'
import { consistentTemplateRefName } from './rules/consistent-template-ref-name.ts'
import { defineMacrosNewline } from './rules/define-macros-newline.ts'
import { defineMacrosTypeStyle } from './rules/define-macros-type-style.ts'
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
    'component-prop-values': componentPropValues,
    'consistent-template-ref-name': consistentTemplateRefName,
    'define-macros-newline': defineMacrosNewline,
    'define-macros-type-style': defineMacrosTypeStyle,
    'prefer-ref-pattern': preferRefPattern,
    'require-component-props': requireComponentProps,
    'sort-script-setup': sortScriptSetup,
  } as unknown as NonNullable<ESLint.Plugin['rules']>,
}
