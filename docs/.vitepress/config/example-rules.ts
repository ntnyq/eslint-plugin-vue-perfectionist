import type { Linter } from 'eslint'

export const EXAMPLE_RULES: Record<string, Linter.RuleEntry> = {
  'vue-perfectionist/callback-style': 'error',
  'vue-perfectionist/component-prop-values': [
    'error',
    {
      targets: [
        {
          components: ['AppStepCounter'],
          props: { count: { multipleOf: 10 } },
        },
      ],
      unknownValues: 'report',
    },
  ],
  'vue-perfectionist/component-prop-types': [
    'error',
    {
      targets: [
        {
          components: ['AppStepper'],
          props: { count: 'number' },
        },
        {
          components: ['AppButton'],
          props: {
            disabled: { type: 'boolean', booleanCasting: true },
          },
        },
      ],
    },
  ],
  'vue-perfectionist/consistent-template-ref-name': 'error',
  'vue-perfectionist/define-macros-newline': 'error',
  'vue-perfectionist/define-macros-type-style': 'error',
  'vue-perfectionist/define-model-name-casing': 'error',
  'vue-perfectionist/max-lines-per-callback': 'error',
  'vue-perfectionist/no-complex-template-expression': 'error',
  'vue-perfectionist/no-complex-v-for-source': 'error',
  'vue-perfectionist/no-restricted-html-elements': [
    'error',
    {
      elements: [
        'button',
        { name: 'input', message: 'Use <AppInput> instead.' },
      ],
    },
  ],
  'vue-perfectionist/no-template-type-assertion': 'error',
  'vue-perfectionist/padding-line-between-tags': 'error',
  'vue-perfectionist/prefer-composable-options': 'error',
  'vue-perfectionist/prefer-define-model': 'error',
  'vue-perfectionist/prefer-function-declaration': 'error',
  'vue-perfectionist/prefer-function-result-pattern': 'error',
  'vue-perfectionist/prefer-on-scope-dispose': 'error',
  'vue-perfectionist/prefer-ref-pattern': 'error',
  'vue-perfectionist/prefer-simple-event-handler': 'error',
  'vue-perfectionist/prefer-template-literal-in-interpolation': 'error',
  'vue-perfectionist/prefer-use-template-ref-inference': 'error',
  'vue-perfectionist/prefer-watch-effect-alias': 'error',
  'vue-perfectionist/require-component-props': [
    'error',
    {
      targets: [{ components: ['AppCounter'], props: ['count'] }],
    },
  ],
  'vue-perfectionist/require-component-slots': [
    'error',
    {
      targets: [
        { components: ['AppDialog'], slots: ['header', 'footer'] },
        { components: ['AppButton'], slots: ['default'] },
      ],
    },
  ],
  'vue-perfectionist/require-composable-return-bindings': 'error',
  'vue-perfectionist/require-injection-key': 'error',
  'vue-perfectionist/require-macro-type-name': 'error',
  'vue-perfectionist/require-props-prefix': 'error',
  'vue-perfectionist/require-vue-generic': [
    'error',
    {
      targets: [
        {
          components: ['ElTableColumn'],
          ignoreWhen: [{ props: { type: { enum: ['index'] } } }],
        },
      ],
    },
  ],
  'vue-perfectionist/sort-composable-destructure': 'error',
  'vue-perfectionist/sort-composable-return': 'error',
  'vue-perfectionist/sort-script-setup': 'error',
}
