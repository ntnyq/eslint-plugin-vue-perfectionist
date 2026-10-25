import { getCaseConverter } from 'uncase'
import {
  getStaticStringValue,
  unwrapExpression,
} from '../utils/ast/expressions.ts'
import { createRule } from '../utils/create-rule.ts'
import { getSetupMacroCalls } from '../utils/vue/setup-macros.ts'
import type {
  DefineModelNameCasingMessageId,
  DefineModelNameCasingOptions,
} from '../types/index.ts'

/**
 * Read both generated prop names to avoid collisions during a model rename.
 *
 * @param name - The explicit or default model name.
 * @returns The value prop and its modifiers prop.
 */
function getModelPropNames(name: string): string[] {
  return [name, name === 'modelValue' ? 'modelModifiers' : `${name}Modifiers`]
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
              call.callee.name === 'defineModel' &&
              call.arguments.length <= 2,
          )
          .map(call => {
            const argument = call.arguments[0]
            const node = argument && unwrapExpression(argument)
            const name = node && getStaticStringValue(node)
            return {
              node,
              name,
              result: name === undefined ? undefined : convert(name),
            }
          })

        for (const model of models) {
          const { node, name, result } = model
          if (!node || name === undefined || !result?.changed) {
            continue
          }
          const targetProps = getModelPropNames(result.output)
          const hasCollision = models.some(
            other =>
              other !== model &&
              [
                ...getModelPropNames(other.name ?? 'modelValue'),
                ...getModelPropNames(other.result?.output ?? 'modelValue'),
              ].some(property => targetProps.includes(property)),
          )
          context.report({
            node,
            messageId: 'unexpectedNameCasing',
            data: { name, casing },
            fix(fixer) {
              if (!options.fix || !result.output || hasCollision) {
                return null
              }
              const quote = context.sourceCode.text[node.range[0]]
              if (quote !== "'" && quote !== '"' && quote !== '`') {
                return null
              }
              let text = JSON.stringify(result.output)
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
