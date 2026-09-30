import { createRule } from '../utils/create-rule.ts'
import { createMacroTypeVisitor } from '../utils/macro-types.ts'
import type { JSONSchema4 } from '@typescript-eslint/utils/json-schema'
import type {
  RequireMacroTypeNameMessageId,
  RequireMacroTypeNameOptions,
} from '../types/index.ts'

// Type aliases cannot use ECMAScript module/strict reserved words or these
// TypeScript intrinsic type names. Contextual words such as `type` are allowed.
const reservedNames = new Set([
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'debugger',
  'default',
  'delete',
  'do',
  'else',
  'enum',
  'export',
  'extends',
  'false',
  'finally',
  'for',
  'function',
  'if',
  'import',
  'in',
  'instanceof',
  'new',
  'null',
  'return',
  'super',
  'switch',
  'this',
  'throw',
  'true',
  'try',
  'typeof',
  'var',
  'void',
  'while',
  'with',
  'implements',
  'interface',
  'let',
  'package',
  'private',
  'protected',
  'public',
  'static',
  'yield',
  'await',
  'any',
  'unknown',
  'never',
  'number',
  'bigint',
  'boolean',
  'string',
  'symbol',
  'object',
  'undefined',
])
const nameSchema = {
  anyOf: [
    { type: 'string', minLength: 1, pattern: '^[^\\s.]+$' },
    { type: 'boolean', enum: [false] },
  ],
} satisfies JSONSchema4

export const requireMacroTypeName = createRule<
  [RequireMacroTypeNameOptions],
  RequireMacroTypeNameMessageId
>({
  name: 'require-macro-type-name',
  meta: {
    type: 'suggestion',
    docs: {
      recommended: false,
      description:
        'require exact call-site names for Vue macro type arguments.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          macros: {
            type: 'object',
            description:
              'Exact type names per macro. False disables that macro.',
            properties: {
              defineProps: nameSchema,
              defineEmits: nameSchema,
              defineSlots: nameSchema,
            },
            additionalProperties: false,
          },
        },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{}],
    messages: {
      expectedNamedType:
        'Expected {{macro}} type argument to be a direct reference named "{{expected}}".',
      unexpectedTypeName:
        'Expected {{macro}} type name "{{expected}}"; found "{{actual}}".',
    },
  },
  defaultOptions: [{}],
  create(context, [options]) {
    const names = {
      defineProps: 'Props',
      defineEmits: 'Emits',
      defineSlots: 'Slots',
      ...options.macros,
    }
    for (const [macro, name] of Object.entries(names)) {
      if (
        name !== false &&
        (!/^[$_\p{ID_Start}][$\u{200C}\u{200D}\p{ID_Continue}]*$/u.test(name) ||
          reservedNames.has(name))
      ) {
        throw new Error(
          `Invalid type name "${name}" for ${macro}. Expected a TypeScript type alias identifier.`,
        )
      }
    }
    return createMacroTypeVisitor(
      context.sourceCode,
      context.filename,
      (macro, node) => {
        const expected = names[macro]
        if (expected === false) {
          return
        }
        if (
          node.type !== 'TSTypeReference' ||
          node.typeName.type !== 'Identifier'
        ) {
          context.report({
            node,
            messageId: 'expectedNamedType',
            data: { macro, expected },
          })
        } else if (node.typeName.name !== expected) {
          context.report({
            node: node.typeName,
            messageId: 'unexpectedTypeName',
            data: { macro, expected, actual: node.typeName.name },
          })
        }
      },
    )
  },
})
