import { analyze } from '@typescript-eslint/scope-manager'
import { AST_NODE_TYPES } from '@typescript-eslint/utils'
import { AST } from 'vue-eslint-parser'
import type { Reference } from '@typescript-eslint/scope-manager'
import type { TSESTree } from '@typescript-eslint/utils'
import type { SourceCode } from '../../types/eslint.ts'

interface TemplateScopeReference {
  id: AST.ESLintIdentifier
  reference: Reference
}

interface TemplateExpressionScope {
  freeReferences: TemplateScopeReference[]
  hasLocalBinding: (identifier: AST.ESLintIdentifier, name: string) => boolean
}

/**
 * Analyze a template expression independently of Vue's synthetic loop scope.
 * Preserve source nodes for diagnostics and never mutate the parser's AST.
 *
 * @param container - The expression and its original template references.
 * @param sourceCode - The source supplying the active parser's visitor keys.
 * @returns Free value references and binding visibility, or undefined for
 * unsupported Vue-specific expression syntax.
 */
export function getTemplateExpressionScope(
  container: AST.VExpressionContainer,
  sourceCode: SourceCode,
): TemplateExpressionScope | undefined {
  const expression = container.expression
  if (!expression) {
    return undefined
  }
  const copies = new Map<object, Record<string, unknown>>()
  const originals = new Map<object, AST.Node>()
  AST.traverseNodes(container, {
    visitorKeys: sourceCode.visitorKeys,
    enterNode(node) {
      const copy: Record<string, unknown> = {
        ...node,
        parent: undefined,
        // Espree omits fields required by typescript-eslint's scope analyzer.
        decorators: Reflect.get(node, 'decorators') ?? [],
        implements: Reflect.get(node, 'implements') ?? [],
        attributes: Reflect.get(node, 'attributes') ?? [],
      }
      copies.set(node, copy)
      originals.set(copy, node)
    },
    leaveNode() {},
  })
  for (const original of originals.values()) {
    const copy = copies.get(original)
    if (!copy) {
      continue
    }
    for (const key of sourceCode.visitorKeys[original.type] ??
      AST.getFallbackKeys(original)) {
      const value: unknown = Reflect.get(original, key)
      if (Array.isArray(value)) {
        copy[key] = value.map(child => copies.get(child) ?? child)
      } else if (value && typeof value === 'object') {
        copy[key] = copies.get(value) ?? value
      }
    }
  }

  const location = { loc: container.loc, range: container.range }
  function statement(value: unknown) {
    return {
      ...location,
      type: 'ExpressionStatement',
      expression: value,
    }
  }
  function parameters(params: AST.ESLintPattern[]) {
    return statement({
      ...location,
      type: 'ArrowFunctionExpression',
      params: params.flatMap(param => {
        const copy = copies.get(param)
        return copy ? [copy] : []
      }),
      body: { ...location, type: 'BlockStatement', body: [] },
      async: false,
      expression: false,
      generator: false,
    })
  }
  let body: unknown[]
  switch (expression.type) {
    case 'VForExpression':
      // The source is evaluated outside the loop aliases. Parameter defaults
      // have their own scope, just like the compiler's renderList callback.
      body = [
        statement(copies.get(expression.right)),
        parameters(expression.left),
      ]
      break
    case 'VOnExpression':
      body = expression.body.map(node => copies.get(node))
      break
    case 'VSlotScopeExpression':
      body = [parameters(expression.params)]
      break
    case 'VGenericExpression':
    case 'VFilterSequenceExpression':
      return undefined
    default:
      body = [statement(copies.get(expression))]
  }
  // Vue's ESTree types omit TypeScript extensions and use different parent
  // types. The adapter above supplies a complete Program for the analyzer.
  const program: TSESTree.Program = {
    ...location,
    type: AST_NODE_TYPES.Program,
    body: body as TSESTree.Program['body'],
    sourceType: 'module',
    comments: [],
    tokens: [],
  }
  const manager = analyze(program, { sourceType: 'module', lib: [] })
  const references = new Map<AST.ESLintIdentifier, Reference>()
  const freeReferences: TemplateScopeReference[] = []
  for (const scope of manager.scopes) {
    for (const reference of scope.references) {
      const original = originals.get(reference.identifier)
      if (original?.type !== 'Identifier' || !reference.isValueReference) {
        continue
      }
      references.set(original, reference)
      if (!reference.resolved) {
        freeReferences.push({ id: original, reference })
      }
    }
  }
  return {
    freeReferences,
    hasLocalBinding(identifier, name) {
      const reference = references.get(identifier)
      if (!reference) {
        return true
      }
      if (identifier.name === name) {
        return reference.resolved?.isValueVariable ?? false
      }
      let scope = reference.from
      while (true) {
        if (scope.set.get(name)?.isValueVariable) {
          return true
        }
        if (!scope.upper) {
          return false
        }
        scope = scope.upper
      }
    },
  }
}
