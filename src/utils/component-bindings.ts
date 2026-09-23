import { isFunction } from '@ntnyq/utils'
import { COMPONENT_NATIVE_TAGS } from '../constants/component-native-tags.ts'
import { hyphenateName, normalizePropName } from './component-prop-config.ts'
import {
  inferPropValue,
  stringPropValue,
  unknownPropValue,
} from './component-prop-value.ts'
import { getRefString, unwrapRefExpression } from './ref-pattern.ts'
import type { TSESLint } from '@typescript-eslint/utils'
import type { AST } from 'vue-eslint-parser'
import type { SourceCode } from '../types/index.ts'
import type { ComponentPropNode, PropValue } from './component-prop-value.ts'

export interface ComponentPropBinding {
  presence: 'present' | 'absent' | 'unknown'
  value: PropValue
  rawNames: Set<string>
}

/**
 * Narrow the parser service without exposing a dependency on its host types.
 */
export function hasComponentTemplateVisitor(services: unknown): services is {
  defineTemplateBodyVisitor: (visitor: {
    VElement: (node: AST.VElement) => void
  }) => TSESLint.RuleListener
} {
  return (
    services !== null &&
    typeof services === 'object' &&
    'defineTemplateBodyVisitor' in services &&
    isFunction(services.defineTemplateBodyVisitor)
  )
}

function isInVPre(element: AST.VElement): boolean {
  let current: AST.VElement | AST.VDocumentFragment = element
  while (current.type === 'VElement') {
    if (
      current.startTag.attributes.some(attribute =>
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

function resolveArgument(
  argument: AST.VIdentifier | AST.VExpressionContainer,
): string | undefined {
  return argument.type === 'VIdentifier'
    ? argument.rawName
    : argument.expression
      ? getRefString(argument.expression)
      : undefined
}

export function matchComponent(element: AST.VElement): string | undefined {
  if (isInVPre(element) || COMPONENT_NATIVE_TAGS.has(element.rawName)) {
    return undefined
  }
  if (element.rawName !== 'component' && element.rawName !== 'Component') {
    return hyphenateName(element.rawName)
  }
  // Dynamic component identity must be explicitly written as a static string.
  const identities = element.startTag.attributes.filter(attribute =>
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
      ? getRefString(identity.value.expression)
      : undefined
    : identity.value?.value
  return name && !COMPONENT_NATIVE_TAGS.has(name)
    ? hyphenateName(name)
    : undefined
}

/**
 * Preserve presence separately from value certainty and raw spelling.
 * Unknown writes can overwrite a value, but cannot remove a known own key.
 */
export function analyzeComponentBindings(
  element: AST.VElement,
  propNames: Iterable<string>,
  sourceCode: SourceCode,
  inferValue: typeof inferPropValue = inferPropValue,
): Map<string, ComponentPropBinding> {
  const bindings = new Map<string, ComponentPropBinding>()
  for (const name of propNames) {
    bindings.set(name, {
      presence: 'absent',
      value: unknownPropValue(element.startTag),
      rawNames: new Set(),
    })
  }

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

  function infer(
    node: ComponentPropNode,
    container: AST.VExpressionContainer,
  ): PropValue {
    return inferValue(node, identifier => {
      const reference = container.references.find(
        item => item.id === identifier,
      )
      if (!reference || reference.variable) {
        return false
      }
      return !sourceCode.scopeManager?.scopes.some(
        scope =>
          (scope.type === 'module' || scope.type === 'global') &&
          scope.set.get('undefined')?.defs.length,
      )
    })
  }

  function spread(
    input: ComponentPropNode,
    container: AST.VExpressionContainer,
  ) {
    const node = unwrapRefExpression(input)
    if (node.type !== 'ObjectExpression') {
      // Nullish and primitive non-string spreads cannot contribute named props.
      const value = infer(node, container)
      if (
        !value.unknown &&
        value.variants.every(variant =>
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
            : getRefString(property.key)
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
      write(
        attribute.key.rawName,
        stringPropValue(
          attribute.value?.value ?? '',
          attribute.value ?? attribute,
        ),
      )
      continue
    }
    const directive = attribute.key.name.name
    if (directive !== 'bind' && directive !== 'model') {
      continue
    }
    const argument = attribute.key.argument
    let name = argument
      ? resolveArgument(argument)
      : directive === 'model'
        ? 'modelValue'
        : undefined
    if (
      attribute.key.modifiers.some(modifier =>
        ['prop', 'attr'].includes(modifier.name),
      )
    ) {
      uncertain(attribute, name)
      continue
    }
    if (!argument && directive === 'bind') {
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
    if (attribute.key.modifiers.some(modifier => modifier.name === 'camel')) {
      name = normalizePropName(name)
    }
    write(
      name,
      attribute.value?.expression
        ? infer(attribute.value.expression, attribute.value)
        : unknownPropValue(attribute),
    )
  }
  return bindings
}
