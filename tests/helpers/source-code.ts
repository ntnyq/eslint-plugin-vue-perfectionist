import { parseForESLint } from '@typescript-eslint/parser'
import { TSESLint } from '@typescript-eslint/utils'
import { getChildren } from '../../src/utils/ast/traversal.ts'
import type { TSESTree } from '@typescript-eslint/utils'

/**
 * Build a real parser-backed source for analysis tests, including the parent
 * links normally supplied by ESLint's traversal. Preserve parser node identity.
 */
export function createSourceCode(text: string): TSESLint.SourceCode {
  const parsed = parseForESLint(text, {
    comment: true,
    loc: true,
    range: true,
    tokens: true,
    sourceType: 'module',
    ecmaVersion: 'latest',
  })
  const sourceCode = new TSESLint.SourceCode({
    text,
    ast: Object.assign(parsed.ast, {
      comments: parsed.ast.comments ?? [],
      tokens: parsed.ast.tokens ?? [],
    }),
    parserServices: parsed.services,
    scopeManager: parsed.scopeManager,
    visitorKeys: Object.fromEntries(
      Object.entries(parsed.visitorKeys).filter(
        (entry): entry is [string, readonly string[]] => entry[1] !== undefined,
      ),
    ),
  })
  function attachParents(node: TSESTree.Node) {
    for (const child of getChildren(node, sourceCode)) {
      Reflect.set(child, 'parent', node)
      attachParents(child)
    }
  }
  attachParents(sourceCode.ast)
  return sourceCode
}
