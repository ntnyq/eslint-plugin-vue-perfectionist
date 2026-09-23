import { COMPONENT_NAMES_SCHEMA } from '../constants/component-props.ts'
import {
  analyzeComponentBindings,
  hasComponentTemplateVisitor,
  matchComponent,
} from '../utils/component-bindings.ts'
import { compileRequiredProps } from '../utils/component-prop-config.ts'
import { createRule } from '../utils/create-rule.ts'
import type {
  RequireComponentPropsMessageId,
  RequireComponentPropsOptions,
} from '../types/index.ts'

export const requireComponentProps = createRule<
  [RequireComponentPropsOptions],
  RequireComponentPropsMessageId
>({
  name: 'require-component-props',
  meta: {
    type: 'suggestion',
    docs: {
      recommended: false,
      description: 'require configured props at Vue component usage sites.',
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
                  ...COMPONENT_NAMES_SCHEMA,
                  description: 'Required prop names.',
                },
              },
              required: ['components', 'props'],
              additionalProperties: false,
            },
          },
          unknownBindings: {
            type: 'string',
            enum: ['report', 'ignore'],
            description:
              'How to handle bindings that may provide a required prop.',
          },
        },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{}],
    messages: {
      missingProp: 'Component <{{component}}> requires prop "{{prop}}".',
      unverifiableRequiredProp:
        'Cannot verify that required prop "{{prop}}" is provided on <{{component}}>.',
    },
  },
  defaultOptions: [{}],
  create(context, [options]) {
    const targets = compileRequiredProps(options.targets ?? [])
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
          if (
            binding.presence === 'present' ||
            (binding.presence === 'unknown' &&
              options.unknownBindings === 'ignore')
          ) {
            continue
          }
          context.report({
            loc:
              binding.presence === 'absent'
                ? {
                    start: {
                      line: node.loc.start.line,
                      column: node.loc.start.column + 1,
                    },
                    end: {
                      line: node.loc.start.line,
                      column: node.loc.start.column + 1 + node.rawName.length,
                    },
                  }
                : binding.value.node.loc,
            messageId:
              binding.presence === 'absent'
                ? 'missingProp'
                : 'unverifiableRequiredProp',
            data: { component: node.rawName, prop: props.get(name) ?? name },
          })
        }
      },
    })
  },
})
