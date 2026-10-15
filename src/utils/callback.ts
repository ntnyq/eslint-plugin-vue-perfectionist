import { CALLBACK_APIS } from '../constants/callback-style.ts'
import {
  getCallIdentity,
  getScriptVariableDefinitions,
  unwrapExpression,
} from './ast.ts'
import { resolveVueGlobals } from './vue-globals.ts'
import type { TSESTree } from '@typescript-eslint/utils'
import type { CallbackTargetOptions, SourceCode } from '../types/index.ts'

/**
 * Visit known callback positions while preserving import and spread boundaries.
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
      Object.values(CALLBACK_APIS).flatMap(group => Object.keys(group)),
      options.vueGlobals,
    ),
  )
  const excluded = new Set(options.exclude)
  const customCallbacks = (options.customCallbacks ?? []).map(custom => ({
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
  }))
  const builtins = new Map(
    (options.groups ?? ['lifecycle', 'watch']).flatMap(group =>
      Object.entries(CALLBACK_APIS[group]).filter(
        ([name]) => !excluded.has(name),
      ),
    ),
  )

  return {
    CallExpression(node: TSESTree.CallExpression) {
      const identity = getCallIdentity(node, sourceCode)
      if (!identity) {
        return
      }
      // The shared sorting resolver names default imports by their local name.
      // Callback matching instead uses their actual export name, "default".
      const callee = unwrapExpression(node.callee)
      const definition =
        callee.type === 'Identifier'
          ? getScriptVariableDefinitions(callee, sourceCode)[0]
          : undefined
      const name =
        definition?.type === 'ImportBinding' &&
        definition.node.type === 'ImportDefaultSpecifier'
          ? 'default'
          : identity.name
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
