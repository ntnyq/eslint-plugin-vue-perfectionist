import { PROP_VALUE_CONSTRAINT_SCHEMA } from '../constants/component-prop-values.ts'
import { COMPONENT_NAMES_SCHEMA } from '../constants/component-props.ts'
import {
  analyzeComponentBindings,
  hasComponentTemplateVisitor,
  matchComponent,
} from '../utils/component-bindings.ts'
import { inferStaticPropValue } from '../utils/component-static-value.ts'
import {
  compilePropValues,
  describePropVariant,
  getValueFailures,
} from '../utils/component-value-constraints.ts'
import { createRule } from '../utils/create-rule.ts'
import type {
  ComponentPropValuesMessageId,
  ComponentPropValuesOptions,
} from '../types/rules/component-prop-values.ts'

export const componentPropValues = createRule<
  [ComponentPropValuesOptions],
  ComponentPropValuesMessageId
>({
  name: 'component-prop-values',
  meta: {
    type: 'suggestion',
    docs: {
      recommended: false,
      description:
        'enforce configured prop value constraints at Vue component usage sites.',
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
                  description: 'Value constraints keyed by prop name.',
                  additionalProperties: PROP_VALUE_CONSTRAINT_SCHEMA,
                },
              },
              required: ['components', 'props'],
              additionalProperties: false,
            },
          },
          unknownValues: {
            type: 'string',
            enum: ['ignore', 'report'],
            description:
              'How to handle supplied values that cannot be established statically.',
          },
        },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{}],
    messages: {
      invalidPropValue:
        'Prop "{{prop}}" on <{{component}}> must be {{expected}}, but received {{actual}}.',
      possiblyInvalidPropValue:
        'Prop "{{prop}}" on <{{component}}> may receive {{actual}}, but must be {{expected}}.',
      unverifiablePropValue:
        'Cannot verify the value of prop "{{prop}}" on <{{component}}> against its constraints.',
    },
  },
  defaultOptions: [{}],
  create(context, [options]) {
    const targets = compilePropValues(options.targets ?? [])
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
          inferStaticPropValue,
        )
        for (const [name, binding] of bindings) {
          const constraint = props.get(name)
          if (!constraint || binding.presence !== 'present') {
            continue
          }
          const expected = new Set<string>()
          const actual = new Set<string>()
          let unknown = binding.value.unknown
          for (const variant of binding.value.variants) {
            const failures = getValueFailures(variant, constraint)
            if (failures === undefined) {
              unknown = true
            } else if (failures.length) {
              failures.forEach(failure => expected.add(failure))
              actual.add(describePropVariant(variant))
            }
          }
          if (
            !actual.size &&
            (!unknown || options.unknownValues !== 'report')
          ) {
            continue
          }
          context.report({
            loc: binding.value.node.loc,
            messageId: actual.size
              ? unknown || binding.value.variants.length > 1
                ? 'possiblyInvalidPropValue'
                : 'invalidPropValue'
              : 'unverifiablePropValue',
            data: {
              component: node.rawName,
              prop: constraint.name,
              expected: [...expected].join(' and '),
              actual: [...actual].join(' | '),
            },
          })
        }
      },
    })
  },
})
