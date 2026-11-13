import { VUE_APIS } from '../sort-statements/constants.ts'
import { validateOptions } from '../sort-statements/options.ts'
import { resolveVueGlobals } from '../vue/globals.ts'
import { DEFAULT_OPTIONS } from './constants.ts'
import type { SortScriptSetupRuleContext } from '../../types/rules/sort-script-setup.ts'

/**
 * Resolve setup defaults and shared auto-import settings before validation.
 */
export function resolveOptions(context: SortScriptSetupRuleContext) {
  return validateOptions({
    ...DEFAULT_OPTIONS,
    ...context.options[0],
    vueGlobals: resolveVueGlobals(
      context.settings,
      VUE_APIS.keys(),
      context.options[0]?.vueGlobals,
    ),
  })
}
