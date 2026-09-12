import { ESLintUtils } from '@typescript-eslint/utils'

export interface PluginDocs {
  recommended?: boolean
}

export const createRule = ESLintUtils.RuleCreator<PluginDocs>(
  name =>
    `https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/docs/rules/${name}.md`,
)
