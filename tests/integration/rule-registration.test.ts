import { Linter } from 'eslint'
import { expect, it } from 'vitest'
import plugin from '../../src/index.ts'
import { vueLanguageOptions } from '../helpers/rule-tester.ts'

it.each([
  {
    name: 'prefer-function-declaration',
    source:
      '<script setup>const useForm = () => { const save = () => {}; return { save } }</script>',
    options: [],
    messageIds: ['expectedFunctionDeclaration', 'expectedFunctionDeclaration'],
  },
  {
    name: 'prefer-composable-options',
    source: '<script setup>function useComments(id, thread = "") {}</script>',
    options: [{ maxPositionalParams: 2 }],
    messageIds: ['expectedOptionsObject'],
  },
  {
    name: 'prefer-watch-effect-alias',
    source:
      '<script setup>watchEffect(update, { flush: "sync", onTrack: debug })</script>',
    options: [],
    messageIds: ['preferredAlias'],
  },
])(
  'registers $name under a plugin alias',
  ({ name, source, options, messageIds }) => {
    const linter = new Linter()
    const configuration: Linter.Config = {
      files: ['**/*.vue'],
      languageOptions: vueLanguageOptions,
      plugins: { vp: plugin },
      settings: { 'vue-perfectionist': { autoImport: true } },
      rules: { [`vp/${name}`]: ['error', ...options] },
    }
    const messages = linter.verify(source, configuration, 'Test.vue')
    expect(
      messages.map(message => [message.ruleId, message.messageId]),
    ).toEqual(messageIds.map(messageId => [`vp/${name}`, messageId]))
  },
)
