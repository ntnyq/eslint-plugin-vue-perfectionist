import { getCaseConverter } from 'uncase'
import {
  getStaticStringValue,
  unwrapExpression,
} from '../utils/ast/expressions.ts'
import {
  hyphenateName,
  normalizePropName,
} from '../utils/component-props/config.ts'
import { createRule } from '../utils/create-rule.ts'
import { getSetupMacroCalls } from '../utils/vue/setup-macros.ts'
import type { TSESTree } from '@typescript-eslint/utils'
import type {
  DefineModelNameCasingMessageId,
  DefineModelNameCasingOptions,
} from '../types/index.ts'

const reservedProps = new Set([
  'key',
  'ref',
  'ref_for',
  'ref_key',
  'onVnodeBeforeMount',
  'onVnodeMounted',
  'onVnodeBeforeUpdate',
  'onVnodeUpdated',
  'onVnodeBeforeUnmount',
  'onVnodeUnmounted',
])

/**
 * Read generated props and runtime modifier lookups to prevent collisions.
 *
 * @param name - The explicit or default model name.
 * @returns Vue-normalized prop names generated or read by the model.
 */
function getModelPropNames(name: string): string[] {
  const props = [
    name,
    name === 'modelValue' ? 'modelModifiers' : `${name}Modifiers`,
  ].map(normalizePropName)
  // Older runtimes look up the original name; newer ones camelize it first.
  for (const modelName of new Set([name, normalizePropName(name)])) {
    if (modelName === 'modelValue' || modelName === 'model-value') {
      props.push('modelModifiers')
    } else {
      const lookups = [
        `${modelName}Modifiers`,
        `${normalizePropName(modelName)}Modifiers`,
        `${hyphenateName(modelName)}Modifiers`,
      ]
      // Lookup keys stay literal; only camelized keys can exist in props.
      props.push(
        ...lookups.filter(property => normalizePropName(property) === property),
      )
    }
  }
  return props
}

/**
 * Detect constraints on the name argument without inspecting the returned ref.
 *
 * @param node - The unwrapped literal within the argument.
 * @param argument - The original name argument, including its TS wrappers.
 * @returns Whether a satisfies expression constrains the name.
 */
function hasSatisfiesConstraint(
  node: TSESTree.Node,
  argument: TSESTree.Node,
): boolean {
  let current: TSESTree.Node | undefined = node
  while (current && current !== argument) {
    current = current.parent
    if (current?.type === 'TSSatisfiesExpression') {
      return true
    }
  }
  return false
}

export const defineModelNameCasing = createRule<
  [DefineModelNameCasingOptions],
  DefineModelNameCasingMessageId
>({
  name: 'define-model-name-casing',
  meta: {
    type: 'suggestion',
    docs: {
      recommended: false,
      description: 'enforce casing for explicit defineModel names.',
    },
    fixable: 'code',
    schema: [
      {
        type: 'object',
        properties: {
          casing: {
            type: 'string',
            enum: ['camelCase', 'PascalCase', 'kebab-case', 'snake_case'],
            description:
              'Casing used for explicit model names. Defaults to camelCase.',
          },
          fix: {
            type: 'boolean',
            description:
              'Automatically rename models, changing the component contract. Defaults to false.',
          },
        },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{}],
    messages: {
      unexpectedNameCasing: 'Expected model name "{{name}}" to use {{casing}}.',
    },
  },
  defaultOptions: [{}],
  create(context, [options]) {
    const casing = options.casing ?? 'camelCase'
    const convert = getCaseConverter(casing)
    return {
      Program(program) {
        const models = getSetupMacroCalls(
          program,
          context.sourceCode,
          context.filename,
        )
          .filter(
            call =>
              call.callee.type === 'Identifier' &&
              call.callee.name === 'defineModel',
          )
          .map(call => {
            const argument = call.arguments[0]
            const node = argument && unwrapExpression(argument)
            const name = node && getStaticStringValue(node)
            const result =
              name === undefined || call.arguments.length > 2
                ? undefined
                : convert(name)
            const replacement =
              argument &&
              node &&
              result?.output &&
              !hasSatisfiesConstraint(node, argument) &&
              !convert(result.output).changed &&
              // Older runtimes read props by the original model name.
              normalizePropName(result.output) === result.output
                ? result.output
                : undefined
            return {
              node,
              name,
              result,
              replacement,
            }
          })

        for (const model of models) {
          const { node, name, result, replacement } = model
          if (!node || name === undefined || !result?.changed) {
            continue
          }
          const targetProps = getModelPropNames(result.output)
          const hasReservedProp = targetProps.some(property =>
            reservedProps.has(property),
          )
          const hasCollision = models.some(
            other =>
              other !== model &&
              [
                ...getModelPropNames(other.name ?? 'modelValue'),
                ...getModelPropNames(
                  other.replacement ?? other.name ?? 'modelValue',
                ),
                // Before Vue 3.5.31, template names declare the default model.
                ...(other.node?.type === 'TemplateLiteral'
                  ? getModelPropNames('modelValue')
                  : []),
              ].some(property => targetProps.includes(property)),
          )
          context.report({
            node,
            messageId: 'unexpectedNameCasing',
            data: { name, casing },
            fix(fixer) {
              if (
                !options.fix ||
                !replacement ||
                hasReservedProp ||
                hasCollision
              ) {
                return null
              }
              const quote = context.sourceCode.text[node.range[0]]
              if (!quote || !["'", '"', '`'].includes(quote)) {
                return null
              }
              let text = JSON.stringify(replacement)
              if (quote !== '"') {
                text = text.slice(1, -1).replaceAll(quote, () => `\\${quote}`)
                if (quote === '`') {
                  text = text.replaceAll('${', '\\${')
                }
                text = `${quote}${text}${quote}`
              }
              return fixer.replaceText(node, text)
            },
          })
        }
      },
    }
  },
})
