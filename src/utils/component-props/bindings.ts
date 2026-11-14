import { getStaticStringValue, unwrapExpression } from '../ast/expressions.ts'
import {
  createStringValueAnalysis,
  createUnknownValueAnalysis,
  inferExpressionValueShape,
} from '../ast/value-analysis.ts'
import { getStaticDirectiveArgument } from '../vue/directive-argument.ts'
import { normalizePropName } from '../vue/names.ts'
import type { AST } from 'vue-eslint-parser'
import type { SourceCode } from '../../types/eslint.ts'
import type {
  ExpressionValueAnalysis,
  ExpressionValueNode,
} from '../ast/value-analysis.ts'

export interface ComponentPropBinding {
  presence: 'present' | 'absent' | 'unknown'
  value: ExpressionValueAnalysis
  rawNames: Set<string>
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
  inferValue: typeof inferExpressionValueShape = inferExpressionValueShape,
): Map<string, ComponentPropBinding> {
  const bindings = new Map<string, ComponentPropBinding>()
  const explicitNames = new Set<string>()
  const uncertainAliases = new Set<string>()

  for (const name of propNames) {
    bindings.set(name, {
      presence: 'absent',
      value: createUnknownValueAnalysis(element.startTag),
      rawNames: new Set(),
    })
  }

  /**
   * Mark affected prop values uncertain while preserving known presence.
   *
   * @param node - The node responsible for the uncertain write.
   * @param name - The affected raw prop name; omit to mark every tracked prop.
   * @param canIntroduceMultipleKeys - Whether this write may introduce multiple
   * raw keys.
   */
  function uncertain(
    node: ExpressionValueNode,
    name?: string,
    canIntroduceMultipleKeys = false,
  ) {
    for (const [key, binding] of bindings) {
      if (name !== undefined && normalizePropName(name) !== key) {
        continue
      }

      // Camelization can remove hyphens before uppercase letters, digits, and
      // underscores. Unknown keys can leave an alias after a later raw-key write.
      if (
        name === undefined &&
        (canIntroduceMultipleKeys || binding.presence !== 'absent') &&
        /[A-Z\d_]/u.test(key)
      ) {
        uncertainAliases.add(key)
      }

      if (binding.presence !== 'present') {
        binding.presence = 'unknown'
      }

      binding.value = createUnknownValueAnalysis(node)
    }
  }

  /**
   * Record a known prop write and invalidate values with ambiguous raw aliases.
   *
   * @param rawName - The raw attribute or object property name.
   * @param value - The inferred value associated with the write.
   */
  function write(rawName: string, value: ExpressionValueAnalysis) {
    const name = normalizePropName(rawName)
    const binding = bindings.get(name)

    if (!binding) {
      return
    }

    binding.presence = 'present'
    binding.rawNames.add(rawName)
    // Vue normalizes aliases after raw-key merging. Do not invent precedence.
    binding.value =
      binding.rawNames.size > 1 || uncertainAliases.has(name)
        ? createUnknownValueAnalysis(value.node)
        : value
  }

  /**
   * Keep the first static key in a compiler-generated explicit prop object.
   * Computed keys remain ordered writes, even when their names are known.
   *
   * @param rawName - The raw attribute or directive argument name.
   * @param value - The value supplied by the explicit binding.
   * @param isStatic - Whether Vue deduplicates this key; defaults to true.
   */
  function writeExplicit(
    rawName: string,
    value: ExpressionValueAnalysis,
    isStatic = true,
  ) {
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
    node: ExpressionValueNode,
    container: AST.VExpressionContainer,
  ): ExpressionValueAnalysis {
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
    input: ExpressionValueNode,
    container: AST.VExpressionContainer,
  ) {
    const node = unwrapExpression(input)

    if (node.type !== 'ObjectExpression') {
      // Nullish and primitive non-string spreads cannot contribute named props.
      const value = infer(node, container)

      if (
        !value.hasUnknownVariants &&
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

      uncertain(node, undefined, true)
      return
    }

    if (
      node.properties.some(
        property => property.type === 'Property' && property.kind === 'get',
      )
    ) {
      // Vue's merge and object spreads read getters during enumeration. A
      // getter can change or delete sibling keys before they are copied, so
      // declaration order cannot establish this object's presence or values.
      uncertain(node, undefined, true)

      // A sole getter's own key is read before its body can modify the object.
      // Keep that key's presence; its value remains unknown below.
      if (node.properties.length !== 1) {
        return
      }
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
        uncertain(property, undefined, name === '__proto__')
      } else {
        write(
          name,
          property.kind === 'init'
            ? infer(property.value, container)
            : createUnknownValueAnalysis(property.value),
        )
      }
    }
  }

  for (const attribute of element.startTag.attributes) {
    if (!attribute.directive) {
      writeExplicit(
        attribute.key.rawName,
        createStringValueAnalysis(
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
      ? getStaticDirectiveArgument(argument)
      : directive === 'model'
        ? 'modelValue'
        : undefined

    if (
      directive === 'bind' &&
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
        uncertain(attribute, undefined, true)
      }

      continue
    }

    if (name === undefined) {
      uncertain(attribute)
      continue
    }

    if (
      directive === 'bind' &&
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
        : createUnknownValueAnalysis(attribute),
      !argument || argument.type === 'VIdentifier',
    )

    if (directive === 'model' && attribute.key.modifiers.length) {
      // Vue emits this object beside the model value in the same prop group.
      writeExplicit(
        argument ? `${name}Modifiers` : 'modelModifiers',
        {
          variants: [{ type: 'object' }],
          hasUnknownVariants: false,
          node: attribute,
        },
        !argument || argument.type === 'VIdentifier',
      )
    }
  }

  return bindings
}
