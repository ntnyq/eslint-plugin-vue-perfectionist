import { ESLintUtils } from '@typescript-eslint/utils'

export const createRule = ESLintUtils.RuleCreator(
  name =>
    `https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/docs/rules/${name}.md`,
)
