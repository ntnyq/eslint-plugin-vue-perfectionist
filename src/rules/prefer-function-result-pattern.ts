import { unwrapExpression } from '../utils/ast/expressions.ts'
import { createRule } from '../utils/create-rule.ts'
import { getCallIdentity } from '../utils/vue/call-identity.ts'
import { resolveVueGlobals } from '../utils/vue/globals.ts'
import type { TSESTree } from '@typescript-eslint/utils'
import type {
  PreferFunctionResultPatternMessageId,
  PreferFunctionResultPatternOptions,
  PreferFunctionResultPatternTarget,
} from '../types/index.ts'

const DEFAULT_TARGETS: PreferFunctionResultPatternTarget[] = [
  {
    source: 'vue',
    names: ['ref', 'shallowRef', 'computed'],
    pattern: '^(is|has|should|can)[A-Z]',
    booleanOnly: true,
  },
  {
    source: '@vueuse/core',
    names: ['useToggle'],
    pattern: '^(is|has|should|can)[A-Z]',
    returnIndex: 0,
    booleanOnly: true,
  },
]

function isBooleanType(node: TSESTree.TypeNode): boolean {
  return (
    node.type === 'TSBooleanKeyword' ||
    (node.type === 'TSLiteralType' &&
      node.literal.type === 'Literal' &&
      typeof node.literal.value === 'boolean') ||
    (node.type === 'TSUnionType' && node.types.every(isBooleanType))
  )
}

function hasBooleanValue(call: TSESTree.CallExpression): boolean {
  const typeArgument = call.typeArguments?.params[0]
  if (typeArgument) {
    return isBooleanType(typeArgument)
  }
  const argument = call.arguments[0]
  const value = argument && unwrapExpression(argument)
  return value?.type === 'Literal' && typeof value.value === 'boolean'
}

function isBooleanExpression(node: TSESTree.Node): boolean {
  const expression = unwrapExpression(node)
  switch (expression.type) {
    case 'Literal':
      return typeof expression.value === 'boolean'
    case 'UnaryExpression':
      return expression.operator === '!'
    case 'BinaryExpression':
      return [
        '==',
        '!=',
        '===',
        '!==',
        '<',
        '<=',
        '>',
        '>=',
        'in',
        'instanceof',
      ].includes(expression.operator)
    case 'LogicalExpression':
      return (
        isBooleanExpression(expression.left) &&
        isBooleanExpression(expression.right)
      )
    case 'ConditionalExpression':
      return (
        isBooleanExpression(expression.consequent) &&
        isBooleanExpression(expression.alternate)
      )
    default:
      return false
  }
}

function isBooleanGetter(node: TSESTree.Node): boolean {
  const getter = unwrapExpression(node)
  if (
    (getter.type !== 'ArrowFunctionExpression' &&
      getter.type !== 'FunctionExpression') ||
    getter.async ||
    getter.generator
  ) {
    return false
  }
  if (getter.returnType) {
    return isBooleanType(getter.returnType.typeAnnotation)
  }
  if (getter.body.type !== 'BlockStatement') {
    return isBooleanExpression(getter.body)
  }
  // A single return cannot fall through or hide a return in a nested function.
  const statement = getter.body.body[0]
  return (
    getter.body.body.length === 1 &&
    statement?.type === 'ReturnStatement' &&
    statement.argument !== null &&
    isBooleanExpression(statement.argument)
  )
}

function isBooleanComputed(call: TSESTree.CallExpression): boolean {
  const typeArgument = call.typeArguments?.params[0]
  if (typeArgument) {
    return isBooleanType(typeArgument)
  }
  const argument = call.arguments[0]
  if (!argument) {
    return false
  }
  const value = unwrapExpression(argument)
  if (value.type !== 'ObjectExpression') {
    return isBooleanGetter(value)
  }
  // Spreads or dynamic keys can replace the getter, so do not infer their value.
  if (
    value.properties.some(
      property => property.type !== 'Property' || property.computed,
    )
  ) {
    return false
  }
  const getters = value.properties.filter(
    property =>
      property.type === 'Property' &&
      ((property.key.type === 'Identifier' && property.key.name === 'get') ||
        (property.key.type === 'Literal' && property.key.value === 'get')),
  )
  const getter = getters[0]
  return (
    getters.length === 1 &&
    getter?.type === 'Property' &&
    getter.kind === 'init' &&
    isBooleanGetter(getter.value)
  )
}

function isBooleanCall(
  call: TSESTree.CallExpression,
  source: string,
  name: string,
): boolean {
  if (source === 'vue' && name === 'computed') {
    return isBooleanComputed(call)
  }
  // useToggle(ref) returns a function; custom values/options are not boolean state.
  if (source === '@vueuse/core' && name === 'useToggle') {
    return (
      !call.typeArguments &&
      (call.arguments.length === 0 ||
        (call.arguments.length === 1 && hasBooleanValue(call)))
    )
  }
  return hasBooleanValue(call)
}

export const preferFunctionResultPattern = createRule<
  [PreferFunctionResultPatternOptions],
  PreferFunctionResultPatternMessageId
>({
  name: 'prefer-function-result-pattern',
  meta: {
    type: 'suggestion',
    docs: {
      recommended: false,
      description: 'enforce naming patterns for function result bindings.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          targets: {
            description:
              'Function groups; replaces defaults. Later matches take precedence.',
            type: 'array',
            items: {
              type: 'object',
              properties: {
                source: {
                  description: 'Exact import module specifier.',
                  type: 'string',
                  minLength: 1,
                },
                names: {
                  description: 'Original export names, or default.',
                  type: 'array',
                  items: { type: 'string', minLength: 1 },
                  minItems: 1,
                  uniqueItems: true,
                },
                pattern: {
                  description: 'JavaScript regular expression source.',
                  type: 'string',
                  format: 'regex',
                },
                returnIndex: {
                  description: 'Zero-based array destructuring position.',
                  type: 'integer',
                  minimum: 0,
                },
                booleanOnly: {
                  description: 'Filter calls using static boolean evidence.',
                  type: 'boolean',
                },
                autoImport: {
                  description: 'Override the shared autoImport setting.',
                  type: 'boolean',
                },
              },
              required: ['source', 'names', 'pattern'],
              additionalProperties: false,
            },
          },
        },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{}],
    messages: {
      unexpectedFunctionResultPattern:
        'Expected function result name "{{name}}" to match pattern "{{pattern}}".',
    },
  },
  defaultOptions: [{}],
  create(context, [options]) {
    const sourceCode = context.sourceCode
    const targets = (options.targets ?? DEFAULT_TARGETS).map(target => ({
      ...target,
      matcher: new RegExp(target.pattern),
      globals: new Set(
        resolveVueGlobals(
          context.settings,
          target.names,
          target.autoImport === undefined
            ? undefined
            : target.autoImport
              ? target.names
              : [],
        ),
      ),
    }))

    return {
      VariableDeclarator(node) {
        if (!node.init) {
          return
        }
        const call = unwrapExpression(node.init)
        if (call.type !== 'CallExpression') {
          return
        }
        const identity = getCallIdentity(call, sourceCode)
        if (!identity) {
          return
        }
        const name = identity.exportedName ?? identity.name
        const selected = new Map<number | undefined, (typeof targets)[number]>()
        for (const target of targets) {
          if (
            target.names.includes(name) &&
            (identity.source === target.source || identity.isUnbound)
          ) {
            selected.set(target.returnIndex, target)
          }
        }
        for (const target of selected.values()) {
          // Select before filtering so an override cannot fall back to an earlier target.
          if (
            (identity.isUnbound && !target.globals.has(name)) ||
            (target.booleanOnly && !isBooleanCall(call, target.source, name))
          ) {
            continue
          }
          const result =
            target.returnIndex === undefined
              ? node.id
              : node.id.type === 'ArrayPattern'
                ? node.id.elements[target.returnIndex]
                : undefined
          const binding =
            result?.type === 'AssignmentPattern' ? result.left : result
          if (
            binding?.type === 'Identifier' &&
            !target.matcher.test(binding.name)
          ) {
            context.report({
              node: binding,
              messageId: 'unexpectedFunctionResultPattern',
              data: { name: binding.name, pattern: target.pattern },
            })
          }
        }
      },
    }
  },
})
