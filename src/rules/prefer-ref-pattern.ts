import { isFunction } from '@ntnyq/utils'
import { ASTUtils } from '@typescript-eslint/utils'
import { getSetupRange, unwrapExpression } from '../utils/ast.ts'
import { createRule } from '../utils/create-rule.ts'
import {
  getRefString,
  getVueRefApi,
  isVueRefVariable,
  unwrapRefExpression,
} from '../utils/ref-pattern.ts'
import type { TSESLint, TSESTree } from '@typescript-eslint/utils'
import type { AST } from 'vue-eslint-parser'
import type {
  PreferRefPatternMessageId,
  PreferRefPatternOptions,
} from '../types/index.ts'

/**
 * Narrow the documented Vue visitor service at the parser boundary.
 */
function hasTemplateVisitor(services: unknown): services is {
  defineTemplateBodyVisitor: (
    templateVisitor: {
      VAttribute: (node: AST.VAttribute | AST.VDirective) => void
    },
    scriptVisitor: TSESLint.RuleListener,
  ) => TSESLint.RuleListener
} {
  return (
    services !== null &&
    typeof services === 'object' &&
    'defineTemplateBodyVisitor' in services &&
    isFunction(services.defineTemplateBodyVisitor)
  )
}

export const preferRefPattern = createRule<
  [PreferRefPatternOptions],
  PreferRefPatternMessageId
>({
  name: 'prefer-ref-pattern',
  meta: {
    type: 'suggestion',
    docs: {
      recommended: false,
      description: 'enforce a naming pattern for Vue template references.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          pattern: {
            type: 'string',
            format: 'regex',
            description: 'JavaScript regular expression source for ref names.',
          },
          targets: {
            type: 'array',
            description: 'Vue template reference usage sites to check.',
            items: {
              type: 'string',
              enum: ['template', 'useTemplateRef', 'render'],
            },
            uniqueItems: true,
          },
        },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{}],
    messages: {
      unexpectedRefPattern:
        'Expected ref name "{{name}}" to match pattern "{{pattern}}".',
    },
  },
  defaultOptions: [{}],
  create(context, [options]) {
    const pattern = options.pattern ?? '.+Ref$'
    const matcher = new RegExp(pattern)
    const targets = new Set(
      options.targets ?? ['template', 'useTemplateRef', 'render'],
    )
    const sourceCode = context.sourceCode
    const setupRange = getSetupRange(sourceCode)

    function checkName(name: string, node: AST.Node | TSESTree.Node) {
      if (!matcher.test(name)) {
        context.report({
          loc: node.loc,
          messageId: 'unexpectedRefPattern',
          data: { name, pattern },
        })
      }
    }

    function checkRenderRef(node: TSESTree.Node) {
      const expression = unwrapExpression(node)
      const name = getRefString(expression)
      if (name !== undefined) {
        checkName(name, expression)
      } else if (expression.type === 'Identifier') {
        const variable = ASTUtils.findVariable(
          sourceCode.getScope(expression),
          expression,
        )
        const isSetupBinding =
          setupRange &&
          expression.range[0] >= setupRange[0] &&
          expression.range[1] <= setupRange[1] &&
          variable?.defs.some(
            definition =>
              definition.node.range[0] >= setupRange[0] &&
              definition.node.range[1] <= setupRange[1],
          )
        if (
          isVueRefVariable(
            variable,
            sourceCode,
            isSetupBinding ? setupRange : undefined,
          )
        ) {
          checkName(expression.name, expression)
        }
      }
    }

    function checkCall(node: TSESTree.CallExpression) {
      const api = getVueRefApi(node, sourceCode)
      if (api === 'useTemplateRef' && targets.has('useTemplateRef')) {
        const argument = node.arguments[0]
        const name = argument && getRefString(argument)
        if (name !== undefined && argument) {
          checkName(name, unwrapRefExpression(argument))
        }
      }
      if (
        api !== 'h' ||
        !targets.has('render') ||
        node.arguments[0]?.type === 'SpreadElement'
      ) {
        return
      }
      const argument = node.arguments[1]
      const props = argument && unwrapExpression(argument)
      if (props?.type !== 'ObjectExpression') {
        return
      }
      // Later properties win. A spread or dynamic key may replace an earlier ref.
      for (const property of props.properties.toReversed()) {
        if (property.type === 'SpreadElement') {
          return
        }
        const key =
          ASTUtils.getPropertyName(property) ?? getRefString(property.key)
        if (key === undefined) {
          return
        }
        if (key === 'ref') {
          if (!property.method && property.kind === 'init') {
            checkRenderRef(property.value)
          }
          return
        }
      }
    }

    function checkAttribute(node: AST.VAttribute | AST.VDirective) {
      if (!node.directive) {
        if (node.key.name === 'ref' && node.value) {
          checkName(node.value.value, node.value)
        }
        return
      }
      if (
        node.key.name.name !== 'bind' ||
        node.key.argument?.type !== 'VIdentifier' ||
        node.key.argument.name !== 'ref' ||
        node.key.modifiers.some(modifier =>
          ['prop', 'attr'].includes(modifier.name),
        ) ||
        !node.value?.expression
      ) {
        return
      }
      const expression = unwrapRefExpression(node.value.expression)
      const name = getRefString(expression)
      if (name !== undefined) {
        checkName(name, expression)
        return
      }
      if (expression.type !== 'Identifier' || !setupRange) {
        return
      }
      const reference = node.value.references.find(ref => ref.id === expression)
      if (!reference || reference.variable) {
        return
      }
      const moduleScope = sourceCode.scopeManager?.scopes.find(
        scope => scope.type === 'module',
      )
      const variable = moduleScope?.set.get(expression.name)
      if (isVueRefVariable(variable, sourceCode, setupRange)) {
        checkName(expression.name, expression)
      }
    }

    const scriptVisitor: TSESLint.RuleListener =
      targets.has('useTemplateRef') || targets.has('render')
        ? { CallExpression: checkCall }
        : {}
    const services = sourceCode.parserServices
    return targets.has('template') && hasTemplateVisitor(services)
      ? services.defineTemplateBodyVisitor(
          { VAttribute: checkAttribute },
          scriptVisitor,
        )
      : scriptVisitor
  },
})
