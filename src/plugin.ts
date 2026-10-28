import { meta } from './meta.ts'
import { callbackStyle } from './rules/callback-style.ts'
import { componentPropTypes } from './rules/component-prop-types.ts'
import { componentPropValues } from './rules/component-prop-values.ts'
import { consistentTemplateRefName } from './rules/consistent-template-ref-name.ts'
import { defineMacrosNewline } from './rules/define-macros-newline.ts'
import { defineMacrosTypeStyle } from './rules/define-macros-type-style.ts'
import { defineModelNameCasing } from './rules/define-model-name-casing.ts'
import { maxLinesPerCallback } from './rules/max-lines-per-callback.ts'
import { noComplexTemplateExpression } from './rules/no-complex-template-expression.ts'
import { noComplexVForSource } from './rules/no-complex-v-for-source.ts'
import { paddingLineBetweenTags } from './rules/padding-line-between-tags.ts'
import { preferComposableOptions } from './rules/prefer-composable-options.ts'
import { preferDefineModel } from './rules/prefer-define-model.ts'
import { preferFunctionDeclaration } from './rules/prefer-function-declaration.ts'
import { preferFunctionResultPattern } from './rules/prefer-function-result-pattern.ts'
import { preferRefPattern } from './rules/prefer-ref-pattern.ts'
import { preferSimpleEventHandler } from './rules/prefer-simple-event-handler.ts'
import { preferTemplateLiteralInInterpolation } from './rules/prefer-template-literal-in-interpolation.ts'
import { preferUseTemplateRefInference } from './rules/prefer-use-template-ref-inference.ts'
import { preferWatchEffectAlias } from './rules/prefer-watch-effect-alias.ts'
import { requireComponentProps } from './rules/require-component-props.ts'
import { requireComponentSlots } from './rules/require-component-slots.ts'
import { requireInjectionKey } from './rules/require-injection-key.ts'
import { requireMacroTypeName } from './rules/require-macro-type-name.ts'
import { requireVueGeneric } from './rules/require-vue-generic.ts'
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
    'define-model-name-casing': defineModelNameCasing,
    'max-lines-per-callback': maxLinesPerCallback,
    'no-complex-template-expression': noComplexTemplateExpression,
    'no-complex-v-for-source': noComplexVForSource,
    'padding-line-between-tags': paddingLineBetweenTags,
    'prefer-composable-options': preferComposableOptions,
    'prefer-define-model': preferDefineModel,
    'prefer-function-declaration': preferFunctionDeclaration,
    'prefer-function-result-pattern': preferFunctionResultPattern,
    'prefer-ref-pattern': preferRefPattern,
    'prefer-simple-event-handler': preferSimpleEventHandler,
    'prefer-template-literal-in-interpolation':
      preferTemplateLiteralInInterpolation,
    'prefer-use-template-ref-inference': preferUseTemplateRefInference,
    'prefer-watch-effect-alias': preferWatchEffectAlias,
    'require-component-props': requireComponentProps,
    'require-component-slots': requireComponentSlots,
    'require-injection-key': requireInjectionKey,
    'require-macro-type-name': requireMacroTypeName,
    'require-vue-generic': requireVueGeneric,
    'sort-script-setup': sortScriptSetup,
  } as unknown as NonNullable<ESLint.Plugin['rules']>,
}
