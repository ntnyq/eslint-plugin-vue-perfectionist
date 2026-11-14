import { PROP_VALUE_CONSTRAINT_SCHEMA } from '../constants/component-prop-values-schema.ts'
import { COMPONENT_NAMES_SCHEMA } from '../constants/component-schema.ts'
import { analyzeComponentBindings } from '../utils/component-props/bindings.ts'
import { inferStaticPropValue } from '../utils/component-props/static-value.ts'
import { createRule } from '../utils/create-rule.ts'
import {
  compileGenericTargets,
  createVueGenericCommentMatcher,
  matchGenericExemptions,
} from '../utils/vue-generic.ts'
import { resolveComponentName } from '../utils/vue/component.ts'
import {
  hasTemplateVisitor,
  hasVueServices,
} from '../utils/vue/parser-services.ts'
import type {
  RequireVueGenericMessageId,
  RequireVueGenericOptions,
} from '../types/index.ts'

export const requireVueGeneric = createRule<
  [RequireVueGenericOptions],
  RequireVueGenericMessageId
>({
  name: 'require-vue-generic',
  meta: {
    type: 'suggestion',
    docs: {
      recommended: false,
      description:
        'require explicit @vue-generic comments on configured components.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          targets: {
            type: 'array',
            description: 'Component targets; an empty array disables checks.',
            items: {
              type: 'object',
              properties: {
                components: COMPONENT_NAMES_SCHEMA,
                ignoreWhen: {
                  type: 'array',
                  description: 'Alternative prop conditions exempting a usage.',
                  items: {
                    type: 'object',
                    properties: {
                      props: {
                        type: 'object',
                        minProperties: 1,
                        description: 'Prop constraints that must all match.',
                        additionalProperties: PROP_VALUE_CONSTRAINT_SCHEMA,
                      },
                    },
                    required: ['props'],
                    additionalProperties: false,
                  },
                },
              },
              required: ['components'],
              additionalProperties: false,
            },
          },
          unknownValues: {
            type: 'string',
            enum: ['ignore', 'report'],
            description: 'How to handle uncertain exemption conditions.',
          },
        },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{}],
    messages: {
      missingVueGeneric:
        'Component <{{component}}> requires a preceding nonempty @vue-generic {...} comment.',
    },
  },
  defaultOptions: [{}],
  create(context, [options]) {
    const targets = compileGenericTargets(options.targets ?? [])
    const services = context.sourceCode.parserServices

    if (
      !targets.size ||
      !hasTemplateVisitor(services) ||
      !hasVueServices(services)
    ) {
      return {}
    }

    const hasVueGenericComment = createVueGenericCommentMatcher(
      services.getDocumentFragment(),
    )

    return services.defineTemplateBodyVisitor({
      VElement(node) {
        const component = resolveComponentName(node)
        const conditions = component && targets.get(component)

        if (!conditions || hasVueGenericComment(node)) {
          return
        }

        const names = new Set(
          conditions.flatMap(condition => [...condition.keys()]),
        )
        const bindings = analyzeComponentBindings(
          node,
          names,
          context.sourceCode,
          inferStaticPropValue,
        )
        const exemption = matchGenericExemptions(conditions, bindings)

        if (
          exemption === 'match' ||
          (exemption === 'unknown' && options.unknownValues === 'ignore')
        ) {
          return
        }

        context.report({
          loc: {
            start: {
              line: node.loc.start.line,
              column: node.loc.start.column + 1,
            },
            end: {
              line: node.loc.start.line,
              column: node.loc.start.column + 1 + node.rawName.length,
            },
          },
          messageId: 'missingVueGeneric',
          data: { component: node.rawName },
        })
      },
    })
  },
})
