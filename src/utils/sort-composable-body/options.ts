import { VUE_APIS } from '../sort-statements/constants.ts'
import { validateGroups } from '../sort-statements/groups.ts'
import { validateOptions } from '../sort-statements/options.ts'
import { resolveVueGlobals } from '../vue/globals.ts'
import { BODY_SELECTORS, DEFAULT_OPTIONS } from './constants.ts'
import type { TSESLint } from '@typescript-eslint/utils'
import type {
  SortComposableBodyMessageId,
  SortComposableBodyRuleOptions,
} from '../../types/index.ts'

/**
 * Resolve body selection and runtime identity policy, rejecting macro groups.
 */
export function resolveOptions(
  context: TSESLint.RuleContext<
    SortComposableBodyMessageId,
    SortComposableBodyRuleOptions
  >,
) {
  const options = {
    ...DEFAULT_OPTIONS,
    ...context.options[0],
    vueGlobals: resolveVueGlobals(
      context.settings,
      VUE_APIS.keys(),
      context.options[0]?.vueGlobals,
    ),
  }

  validateOptions(options)
  validateGroups(options, BODY_SELECTORS)

  return options
}
