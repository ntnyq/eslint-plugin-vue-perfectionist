import {
  COMPONENT_NAMES_SCHEMA,
  PROP_TYPES_SCHEMA,
} from '../constants/component-props.ts'
import {
  analyzeComponentBindings,
  hasComponentTemplateVisitor,
  matchComponent,
} from '../utils/component-bindings.ts'
import {
  compilePropTypes,
  hyphenateName,
} from '../utils/component-prop-config.ts'
import { createRule } from '../utils/create-rule.ts'
import type {
  ComponentPropTypesMessageId,
  ComponentPropTypesOptions,
} from '../types/index.ts'

export const componentPropTypes = createRule<
  [ComponentPropTypesOptions],
  ComponentPropTypesMessageId
>({
  name: 'component-prop-types',
  meta: {
    type: 'suggestion',
    docs: {
      recommended: false,
      description:
        'enforce configured prop value types at Vue component usage sites.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          targets: {
            type: 'array',
            description: 'Component contracts; an empty array disables checks.',
            items: {
              type: 'object',
              properties: {
                components: COMPONENT_NAMES_SCHEMA,
                props: {
                  type: 'object',
                  minProperties: 1,
                  description: 'Allowed types keyed by prop name.',
                  additionalProperties: {
                    anyOf: [
                      PROP_TYPES_SCHEMA,
                      {
                        type: 'object',
                        properties: {
                          type: PROP_TYPES_SCHEMA,
                          booleanCasting: {
                            type: 'boolean',
                            description:
                              'Enable Vue Boolean casting of empty/name strings.',
                          },
                        },
                        required: ['type'],
                        additionalProperties: false,
                      },
                    ],
                  },
                },
              },
              required: ['components', 'props'],
              additionalProperties: false,
            },
          },
          unknownValues: {
            type: 'string',
            enum: ['ignore', 'report'],
            description: 'How to handle supplied values with unknown types.',
          },
        },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{}],
    messages: {
      invalidPropType:
        'Expected prop "{{prop}}" on <{{component}}> to be {{expected}}, but received {{actual}}.',
      possiblyInvalidPropType:
        'Prop "{{prop}}" on <{{component}}> may receive {{actual}}, but only {{expected}} is allowed.',
      unverifiablePropType:
        'Cannot verify the type of prop "{{prop}}" on <{{component}}>; expected {{expected}}.',
    },
  },
  defaultOptions: [{}],
  create(context, [options]) {
    const targets = compilePropTypes(options.targets ?? [])
    const services = context.sourceCode.parserServices
    if (!hasComponentTemplateVisitor(services)) {
      return {}
    }
    return services.defineTemplateBodyVisitor({
      VElement(node) {
        const component = matchComponent(node)
        const props = component && targets.get(component)
        if (!props) {
          return
        }
        const bindings = analyzeComponentBindings(
          node,
          props.keys(),
          context.sourceCode,
        )
        for (const [name, binding] of bindings) {
          const constraint = props.get(name)
          if (!constraint || binding.presence !== 'present') {
            continue
          }
          const actual = [
            ...new Set(
              binding.value.variants.flatMap(variant => {
                if (!constraint.booleanCasting || variant.type !== 'string') {
                  return [variant.type]
                }
                if (variant.stringValue === undefined) {
                  return ['string', 'boolean'] as const
                }
                return [
                  variant.stringValue === '' ||
                  variant.stringValue === hyphenateName(name)
                    ? ('boolean' as const)
                    : ('string' as const),
                ]
              }),
            ),
          ].sort()
          const invalid = actual.filter(
            type => !constraint.types.includes(type),
          )
          let messageId: ComponentPropTypesMessageId
          if (invalid.length) {
            messageId =
              actual.length > 1 || binding.value.unknown
                ? 'possiblyInvalidPropType'
                : 'invalidPropType'
          } else if (
            binding.value.unknown &&
            options.unknownValues === 'report'
          ) {
            messageId = 'unverifiablePropType'
          } else {
            continue
          }
          context.report({
            loc: binding.value.node.loc,
            messageId,
            data: {
              component: node.rawName,
              prop: constraint.name,
              expected: constraint.types.join(' | '),
              actual: invalid.join(' | '),
            },
          })
        }
      },
    })
  },
})
