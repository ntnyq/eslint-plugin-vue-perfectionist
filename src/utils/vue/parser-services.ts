import { isFunction as isCallable } from '@ntnyq/utils'
import type { TSESLint, TSESTree } from '@typescript-eslint/utils'
import type { AST } from 'vue-eslint-parser'

/**
 * This boundary checks the documented vue-eslint-parser service, whose return
 * type is not part of typescript-eslint's parser service declaration.
 *
 * @param services - The parser services object to inspect.
 * @returns Whether a callable getDocumentFragment service is available.
 */
export function hasVueServices(
  services: unknown,
): services is { getDocumentFragment: () => AST.VDocumentFragment | null } {
  return (
    services !== null &&
    typeof services === 'object' &&
    'getDocumentFragment' in services &&
    isCallable(services.getDocumentFragment)
  )
}

// vue-eslint-parser also visits TypeScript nodes produced by the script parser.
type TemplateNode = AST.Node | Extract<TSESTree.Node, { type: `TS${string}` }>

type TemplateVisitor = {
  [Type in TemplateNode['type']]?: (
    node: Extract<TemplateNode, { type: Type }>,
  ) => void
} & {
  [Type in TemplateNode['type'] as `${Type}:exit`]?: (
    node: Extract<TemplateNode, { type: Type }>,
  ) => void
} & {
  '*'?: (node: TemplateNode) => void
  '*:exit'?: (node: TemplateNode) => void
}

/**
 * Narrow the documented Vue visitor service at the parser boundary.
 *
 * @param services - The parser services object to inspect.
 * @returns Whether a callable defineTemplateBodyVisitor service is available.
 */
export function hasTemplateVisitor(services: unknown): services is {
  defineTemplateBodyVisitor: (
    templateVisitor: TemplateVisitor,
    scriptVisitor?: TSESLint.RuleListener,
  ) => TSESLint.RuleListener
} {
  return (
    services !== null &&
    typeof services === 'object' &&
    'defineTemplateBodyVisitor' in services &&
    isCallable(services.defineTemplateBodyVisitor)
  )
}
