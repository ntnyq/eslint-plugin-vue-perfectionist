import { ESLintUtils } from '@typescript-eslint/utils'

export interface PluginDocs {
  recommended?: boolean
}

/**
 * Create an ESLint rule with plugin documentation URLs and typed metadata.
 *
 * @template Options - The tuple of supported rule options.
 * @template MessageIds - The diagnostic message identifiers used by the rule.
 * @param rule - The rule definition, default options, and documentation metadata.
 * @returns The ESLint rule module with its documentation URL populated.
 */
export const createRule = ESLintUtils.RuleCreator<PluginDocs>(
  /**
   * Build the documentation URL used by a plugin rule.
   *
   * @param name - The rule name matching its Markdown filename.
   * @returns The GitHub URL of the rule documentation.
   */
  name =>
    `https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/docs/rules/${name}.md`,
)
