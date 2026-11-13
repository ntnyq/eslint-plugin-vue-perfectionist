import { COMPONENT_NATIVE_TAGS } from '../../constants/component-native-tags.ts'
import { getStaticStringValue } from '../ast/expressions.ts'
import { getStaticDirectiveArgument } from './directive-argument.ts'
import { hyphenateName } from './names.ts'
import { isInVPre } from './v-pre.ts'
import type { AST } from 'vue-eslint-parser'

/**
 * Resolve a component identity while excluding native tags, slot outlets, and
 * v-pre content.
 *
 * @param element - The template element to inspect.
 * @returns The hyphenated component name, or undefined when the identity is
 * unsupported or ambiguous.
 */
export function resolveComponentName(
  element: AST.VElement,
): string | undefined {
  // Only the lowercase spelling is a slot outlet; Slot remains a component.
  if (
    element.rawName === 'slot' ||
    isInVPre(element) ||
    COMPONENT_NATIVE_TAGS.has(element.rawName)
  ) {
    return undefined
  }
  if (element.rawName !== 'component' && element.rawName !== 'Component') {
    return hyphenateName(element.rawName)
  }
  // Dynamic component identity must be explicitly written as a static string.
  const identities = element.startTag.attributes.filter(
    /**
     * Identify an attribute that supplies a dynamic component identity.
     *
     * @param attribute - The component attribute to inspect.
     * @returns A truthy value for a static is attribute or a binding with a
     * resolved is argument.
     */
    attribute =>
      attribute.directive
        ? attribute.key.name.name === 'bind' &&
          attribute.key.argument &&
          getStaticDirectiveArgument(attribute.key.argument) === 'is'
        : attribute.key.name === 'is',
  )
  if (identities.length !== 1) {
    return undefined
  }
  const identity = identities[0]
  if (!identity) {
    return undefined
  }
  const name = identity.directive
    ? !identity.key.modifiers.length && identity.value?.expression
      ? getStaticStringValue(identity.value.expression)
      : undefined
    : identity.value?.value
  return name && !COMPONENT_NATIVE_TAGS.has(name)
    ? hyphenateName(name)
    : undefined
}
