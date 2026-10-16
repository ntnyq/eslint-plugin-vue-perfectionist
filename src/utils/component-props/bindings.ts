import { COMPONENT_NATIVE_TAGS } from '../../constants/component-native-tags.ts'
import { getStaticStringValue, unwrapExpression } from '../ast/expressions.ts'
import { hyphenateName, normalizePropName } from './config.ts'
import { inferPropValue, stringPropValue, unknownPropValue } from './value.ts'
import type { AST } from 'vue-eslint-parser'
import type { SourceCode } from '../../types/eslint.ts'
import type { ComponentPropNode, PropValue } from './value.ts'

export interface ComponentPropBinding {
  presence: 'present' | 'absent' | 'unknown'
  value: PropValue
  rawNames: Set<string>
}

/**
 * Check whether v-pre disables compilation on an element or its ancestors.
 *
 * @param element - The element to inspect.
 * @returns Whether the element is within a v-pre subtree.
 */
function isInVPre(element: AST.VElement): boolean {
  let current: AST.VElement | AST.VDocumentFragment = element
  while (current.type === 'VElement') {
    if (
      current.startTag.attributes.some(
        /**
         * Recognize v-pre in parsed directive or raw attribute form.
         *
         * @param attribute - The ancestor attribute to inspect.
         * @returns Whether the attribute enables v-pre.
         */
        attribute =>
          attribute.directive
            ? attribute.key.name.name === 'pre'
            : attribute.key.name === 'v-pre',
      )
    ) {
      return true
    }
    current = current.parent
  }
  return false
}

/**
 * Resolve a directive argument with a statically known name.
 *
 * @param argument - The static or dynamic directive argument.
 * @returns The raw static name or constant string, or undefined for unresolved
 * arguments.
 */
function resolveArgument(
  argument: AST.VIdentifier | AST.VExpressionContainer,
): string | undefined {
  return argument.type === 'VIdentifier'
    ? argument.rawName
    : argument.expression
      ? getStaticStringValue(argument.expression)
      : undefined
}

/**
 * Resolve a component identity while excluding native tags and v-pre content.
 *
 * @param element - The template element to inspect.
 * @returns The hyphenated component name, or undefined when the identity is
 * unsupported or ambiguous.
 */
export function matchComponent(element: AST.VElement): string | undefined {
  if (isInVPre(element) || COMPONENT_NATIVE_TAGS.has(element.rawName)) {
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
          resolveArgument(attribute.key.argument) === 'is'
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

/**
 * Preserve presence separately from value certainty and raw spelling. Unknown
 * writes can overwrite a value, but cannot remove a known own key.
 *
 * @param element - The component element whose attributes are analyzed.
 * @param propNames - The normalized prop names to track.
 * @param sourceCode - The source code used to distinguish global undefined from
 * script bindings.
 * @param inferValue - The value inference function; defaults to structural prop
 * inference.
 * @returns Bindings keyed by normalized prop name, including presence, value
 * certainty, and raw spellings.
 */
export function analyzeComponentBindings(
  element: AST.VElement,
  propNames: Iterable<string>,
  sourceCode: SourceCode,
  inferValue: typeof inferPropValue = inferPropValue,
): Map<string, ComponentPropBinding> {
  const bindings = new Map<string, ComponentPropBinding>()
  const explicitNames = new Set<string>()
  for (const name of propNames) {
    bindings.set(name, {
      presence: 'absent',
      value: unknownPropValue(element.startTag),
      rawNames: new Set(),
    })
  }

  /**
   * Mark affected prop values uncertain while preserving known presence.
   *
   * @param node - The node responsible for the uncertain write.
   * @param name - The affected raw prop name; omit to mark every tracked prop.
   */
  function uncertain(node: ComponentPropNode, name?: string) {
    for (const [key, binding] of bindings) {
      if (name !== undefined && normalizePropName(name) !== key) {
        continue
      }
      if (binding.presence !== 'present') {
        binding.presence = 'unknown'
      }
      binding.value = unknownPropValue(node)
    }
  }

  /**
   * Record a known prop write and invalidate values with ambiguous raw aliases.
   *
   * @param rawName - The raw attribute or object property name.
   * @param value - The inferred value associated with the write.
   */
  function write(rawName: string, value: PropValue) {
    const binding = bindings.get(normalizePropName(rawName))
    if (!binding) {
      return
    }
    binding.presence = 'present'
    binding.rawNames.add(rawName)
    // Vue normalizes aliases after raw-key merging. Do not invent precedence.
    binding.value =
      binding.rawNames.size > 1 ? unknownPropValue(value.node) : value
  }

  /**
   * Keep the first static key in a compiler-generated explicit prop object.
   * Computed keys remain ordered writes, even when their names are known.
   *
   * @param rawName - The raw attribute or directive argument name.
   * @param value - The value supplied by the explicit binding.
   * @param isStatic - Whether Vue deduplicates this key; defaults to true.
   */
  function writeExplicit(rawName: string, value: PropValue, isStatic = true) {
    if (isStatic) {
      if (explicitNames.has(rawName)) {
        return
      }
      explicitNames.add(rawName)
    }
    write(rawName, value)
  }

  /**
   * Infer a prop value with template-aware global undefined recognition.
   *
   * @param node - The expression to infer.
   * @param container - The expression container supplying template references.
   * @returns The inferred value and its remaining uncertainty.
   */
  function infer(
    node: ComponentPropNode,
    container: AST.VExpressionContainer,
  ): PropValue {
    return inferValue(
      node,
      /**
       * Check whether an undefined reference is unshadowed in template and script
       * scopes.
       *
       * @param identifier - The identifier node being resolved.
       * @returns Whether the reference can safely denote global undefined.
       */
      identifier => {
        const reference = container.references.find(
          /**
           * Find the template reference corresponding to the identifier.
           *
           * @param item - The template reference to inspect.
           * @returns Whether the reference points to the exact identifier.
           */
          item => item.id === identifier,
        )
        if (!reference || reference.variable) {
          return false
        }
        return !sourceCode.scopeManager?.scopes.some(
          /**
           * Detect a script-level binding that shadows global undefined.
           *
           * @param scope - The script scope to inspect.
           * @returns A truthy definition count when a module or global scope
           * declares undefined.
           */
          scope =>
            (scope.type === 'module' || scope.type === 'global') &&
            scope.set.get('undefined')?.defs.length,
        )
      },
    )
  }

  /**
   * Apply object spread writes, conservatively handling unresolved keys and
   * values.
   *
   * @param input - The spread expression to inspect.
   * @param container - The containing template expression used for scope
   * resolution.
   */
  function spread(
    input: ComponentPropNode,
    container: AST.VExpressionContainer,
  ) {
    const node = unwrapExpression(input)
    if (node.type !== 'ObjectExpression') {
      // Nullish and primitive non-string spreads cannot contribute named props.
      const value = infer(node, container)
      if (
        !value.unknown &&
        value.variants.every(
          /**
           * Recognize scalar spreads that cannot introduce named component props.
           *
           * @param variant - The inferred spread value variant.
           * @returns Whether the variant is nullish or a non-string primitive.
           */
          variant =>
            ['null', 'undefined', 'number', 'boolean', 'bigint'].includes(
              variant.type,
            ),
        )
      ) {
        return
      }
      uncertain(node)
      return
    }
    for (const property of node.properties) {
      if (property.type !== 'Property') {
        spread(property.argument, container)
        continue
      }
      const name =
        !property.computed && property.key.type === 'Identifier'
          ? property.key.name
          : property.key.type === 'Literal' &&
              (typeof property.key.value === 'number' ||
                typeof property.key.value === 'bigint')
            ? String(property.key.value)
            : getStaticStringValue(property.key)
      if (
        name === undefined ||
        (name === '__proto__' &&
          !property.computed &&
          !property.method &&
          property.kind === 'init')
      ) {
        uncertain(property)
      } else {
        write(
          name,
          property.kind === 'init'
            ? infer(property.value, container)
            : unknownPropValue(property.value),
        )
      }
    }
  }

  for (const attribute of element.startTag.attributes) {
    if (!attribute.directive) {
      writeExplicit(
        attribute.key.rawName,
        stringPropValue(
          attribute.value?.value ?? '',
          attribute.value ?? attribute,
        ),
      )
      continue
    }
    const directive = attribute.key.name.name
    const argument = attribute.key.argument
    // Object bindings and dynamic event names flush Vue's explicit prop object.
    if (
      directive === 'on' &&
      (!argument || argument.type === 'VExpressionContainer')
    ) {
      explicitNames.clear()
      continue
    }
    if (directive !== 'bind' && directive !== 'model') {
      continue
    }
    let name = argument
      ? resolveArgument(argument)
      : directive === 'model'
        ? 'modelValue'
        : undefined
    if (
      attribute.key.modifiers.some(
        /**
         * Detect binding modifiers whose prop behavior is not modeled.
         *
         * @param modifier - The directive modifier to inspect.
         * @returns Whether the modifier forces a DOM property or attribute
         * binding.
         */
        modifier => ['prop', 'attr'].includes(modifier.name),
      )
    ) {
      uncertain(attribute, name)
      continue
    }
    if (!argument && directive === 'bind') {
      explicitNames.clear()
      if (attribute.value?.expression) {
        spread(attribute.value.expression, attribute.value)
      } else {
        uncertain(attribute)
      }
      continue
    }
    if (name === undefined) {
      uncertain(attribute)
      continue
    }
    if (
      attribute.key.modifiers.some(
        /**
         * Detect explicit camel-case normalization of a binding argument.
         *
         * @param modifier - The directive modifier to inspect.
         * @returns Whether the modifier is camel.
         */
        modifier => modifier.name === 'camel',
      )
    ) {
      name = normalizePropName(name)
    }
    writeExplicit(
      name,
      attribute.value?.expression
        ? infer(attribute.value.expression, attribute.value)
        : unknownPropValue(attribute),
      !argument || argument.type === 'VIdentifier',
    )
  }
  return bindings
}
