import { COMPONENT_NAMES_SCHEMA } from '../constants/component-props.ts'
import { getStaticStringValue } from '../utils/ast/expressions.ts'
import { matchComponent } from '../utils/component-props/bindings.ts'
import { hyphenateName } from '../utils/component-props/config.ts'
import { createRule } from '../utils/create-rule.ts'
import { hasTemplateVisitor } from '../utils/vue/parser-services.ts'
import type { AST } from 'vue-eslint-parser'
import type {
  RequireComponentSlotsMessageId,
  RequireComponentSlotsOptions,
} from '../types/index.ts'

/**
 * Find the slot declaration on a component or template.
 *
 * @param element - The element whose attributes are inspected.
 * @returns Its slot attribute, including static names parsed as raw attributes.
 */
function getSlotAttribute(
  element: AST.VElement,
): AST.VAttribute | AST.VDirective | undefined {
  if (
    element.startTag.attributes.some(attribute =>
      attribute.directive
        ? attribute.key.name.name === 'pre'
        : attribute.key.name === 'v-pre',
    )
  ) {
    return undefined
  }
  return element.startTag.attributes.find(attribute =>
    attribute.directive
      ? attribute.key.name.name === 'slot'
      : attribute.key.rawName.startsWith('#') ||
        attribute.key.rawName.startsWith('v-slot:'),
  )
}

/**
 * Read a slot name without evaluating user expressions.
 *
 * @param attribute - The slot declaration to inspect.
 * @param sourceText - The source text used to preserve the complete name.
 * @returns The case-sensitive name, or undefined for an unresolved argument.
 */
function getSlotName(
  attribute: AST.VAttribute | AST.VDirective,
  sourceText: string,
): string | undefined {
  if (!attribute.directive) {
    // Names ending in a dot are not represented as directives by the parser.
    const key = sourceText.slice(...attribute.key.range)
    const name = key.startsWith('#')
      ? key.slice(1)
      : key.slice('v-slot:'.length)
    // A leading dot introduces modifiers without a slot argument in Vue.
    if (!name || name.startsWith('.')) {
      return 'default'
    }
    return name.startsWith('[') ? undefined : name
  }
  const argument = attribute.key.argument
  if (!argument) {
    return 'default'
  }
  if (argument.type === 'VIdentifier') {
    // Rejoining parsed modifiers would discard consecutive or trailing dots.
    return sourceText.slice(argument.range[0], attribute.key.range[1])
  }
  // A suffix after the bracket changes the expression Vue evaluates.
  if (argument.range[1] !== attribute.key.range[1]) {
    return undefined
  }
  return argument.expression
    ? getStaticStringValue(argument.expression)
    : undefined
}

export const requireComponentSlots = createRule<
  [RequireComponentSlotsOptions],
  RequireComponentSlotsMessageId
>({
  name: 'require-component-slots',
  meta: {
    type: 'suggestion',
    docs: {
      recommended: false,
      description: 'require configured slots at Vue component usage sites.',
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
                slots: {
                  ...COMPONENT_NAMES_SCHEMA,
                  description: 'Required case-sensitive slot names.',
                },
              },
              required: ['components', 'slots'],
              additionalProperties: false,
            },
          },
          unknownSlots: {
            type: 'string',
            enum: ['report', 'ignore'],
            description:
              'How to handle dynamic names that may provide a required slot.',
          },
        },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{}],
    messages: {
      missingSlot: 'Component <{{component}}> requires slot "{{slot}}".',
      unverifiableRequiredSlot:
        'Cannot verify that required slot "{{slot}}" is provided on <{{component}}>.',
    },
  },
  defaultOptions: [{}],
  create(context, [options]) {
    const targets = new Map<string, Set<string>>()
    for (const target of options.targets ?? []) {
      for (const component of target.components) {
        const key = hyphenateName(component)
        const slots = targets.get(key) ?? new Set<string>()
        for (const slot of target.slots) {
          slots.add(slot)
        }
        targets.set(key, slots)
      }
    }
    const services = context.sourceCode.parserServices
    if (!targets.size || !hasTemplateVisitor(services)) {
      return {}
    }
    return services.defineTemplateBodyVisitor({
      VElement(node) {
        // Dynamic component identities are outside this rule's template contract.
        if (['component', 'Component', 'slot'].includes(node.rawName)) {
          return
        }
        const component = matchComponent(node)
        const requiredSlots = component && targets.get(component)
        if (!requiredSlots) {
          return
        }
        const slots = new Set<string>()
        let hasUnknownSlot = false

        function collectSlot(attribute: AST.VAttribute | AST.VDirective) {
          const name = getSlotName(attribute, context.sourceCode.text)
          if (name === undefined) {
            hasUnknownSlot = true
          } else {
            slots.add(name)
          }
        }

        const componentSlot = getSlotAttribute(node)
        if (componentSlot) {
          // With component-level v-slot, all children belong to that slot.
          collectSlot(componentSlot)
        } else {
          for (const child of node.children) {
            const directive =
              child.type === 'VElement' && child.rawName === 'template'
                ? getSlotAttribute(child)
                : undefined
            if (directive) {
              collectSlot(directive)
            } else if (
              child.type !== 'VText' ||
              // Vue retains Unicode spacing characters as slot content.
              /[^\t\r\n\f ]/u.test(child.value)
            ) {
              // Comments are not children in vue-eslint-parser's template AST.
              slots.add('default')
            }
          }
        }
        for (const slot of requiredSlots) {
          if (
            slots.has(slot) ||
            (hasUnknownSlot && options.unknownSlots === 'ignore')
          ) {
            continue
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
            messageId: hasUnknownSlot
              ? 'unverifiableRequiredSlot'
              : 'missingSlot',
            data: { component: node.rawName, slot },
          })
        }
      },
    })
  },
})
