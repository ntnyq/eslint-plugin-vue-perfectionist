import { CALLBACK_APIS } from '../../constants/callback-style.ts'
import { getCallIdentity } from './call-identity.ts'
import { resolveVueGlobals } from './globals.ts'
import type { TSESTree } from '@typescript-eslint/utils'
import type { SourceCode } from '../../types/eslint.ts'
import type { CallbackTargetOptions } from '../../types/index.ts'

/**
 * Visit known callback positions while preserving import and spread boundaries.
 *
 * @param sourceCode - The source code used to resolve call identities.
 * @param settings - The shared ESLint settings for Vue auto-import recognition.
 * @param options - The callback groups, exclusions, imports, globals, and
 * custom targets.
 * @param checkCallback - The handler invoked with each eligible argument and
 * resolved API name.
 * @returns A call-expression visitor that skips unknown and spread-ambiguous
 * callback positions.
 * @throws {Error} If shared autoImport is present but is not a boolean.
 */
export function createCallbackVisitor(
  sourceCode: SourceCode,
  settings: Record<string, unknown>,
  options: CallbackTargetOptions,
  checkCallback: (argument: TSESTree.Node, name: string) => void,
) {
  const vueSources = new Set(options.vueImportSources ?? ['vue'])
  const vueGlobals = new Set(
    resolveVueGlobals(
      settings,
      Object.values(CALLBACK_APIS).flatMap(
        /**
         * List supported API names from one built-in callback group.
         *
         * @param group - The callback group mapping API names to argument
         * positions.
         * @returns The API names in that group.
         */
        group => Object.keys(group),
      ),
      options.vueGlobals,
    ),
  )
  const excluded = new Set(options.exclude)
  const customCallbacks = (options.customCallbacks ?? []).map(
    /**
     * Resolve the effective auto-import policy for a custom callback target.
     *
     * @param custom - The custom callback configuration.
     * @returns The target with an explicit effective autoImport flag.
     * @throws {Error} If shared autoImport is present but is not a boolean.
     */
    custom => ({
      ...custom,
      autoImport:
        resolveVueGlobals(
          settings,
          [custom.name],
          custom.autoImport === undefined
            ? undefined
            : custom.autoImport
              ? [custom.name]
              : [],
        ).length > 0,
    }),
  )
  const builtins = new Map(
    (options.groups ?? ['lifecycle', 'watch']).flatMap(
      /**
       * Collect enabled built-in callbacks from a configured group.
       *
       * @param group - The built-in callback group name.
       * @returns API name and callback-index pairs after exclusions.
       */
      group =>
        Object.entries(CALLBACK_APIS[group]).filter(
          /**
           * Exclude built-in APIs disabled by the rule options.
           *
           * @param entry - The API name and callback-index pair.
           * @param entry."0" - The built-in callback API name.
           * @returns Whether the API name is not excluded.
           */
          ([name]) => !excluded.has(name),
        ),
    ),
  )

  return {
    /**
     * Visit eligible callback arguments before the first spread argument.
     *
     * @param node - The call expression being visited.
     */
    CallExpression(node: TSESTree.CallExpression) {
      const identity = getCallIdentity(node, sourceCode)
      if (!identity) {
        return
      }
      const name = identity.exportedName ?? identity.name
      const indices = new Set<number>()
      if (
        (identity.source !== undefined && vueSources.has(identity.source)) ||
        (identity.isUnbound && vueGlobals.has(name))
      ) {
        const index = builtins.get(name)
        if (index !== undefined) {
          indices.add(index)
        }
      }
      for (const custom of customCallbacks) {
        if (
          custom.name === name &&
          (custom.source === identity.source ||
            (identity.isUnbound && custom.autoImport))
        ) {
          for (const index of custom.callbackIndices) {
            indices.add(index)
          }
        }
      }
      const spreadIndex = node.arguments.findIndex(
        /**
         * Find an argument that makes subsequent callback positions ambiguous.
         *
         * @param argument - The call argument.
         * @returns Whether the argument is a spread element.
         */
        argument => argument.type === 'SpreadElement',
      )
      for (const index of indices) {
        const argument = node.arguments[index]
        if (argument && (spreadIndex === -1 || index < spreadIndex)) {
          checkCallback(argument, name)
        }
      }
    },
  }
}
