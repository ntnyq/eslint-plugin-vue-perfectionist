import { validatePropName } from './component-props/config.ts'
import {
  compileConstraint,
  getValueFailures,
} from './component-props/constraints.ts'
import { hyphenateName } from './vue/names.ts'
import type { AST } from 'vue-eslint-parser'
import type { RequireVueGenericTarget } from '../types/rules/require-vue-generic.ts'
import type { ComponentPropBinding } from './component-props/bindings.ts'
import type { CompiledValueConstraint } from './component-props/constraints.ts'

type MatchResult = 'match' | 'mismatch' | 'unknown'
type CompiledCondition = Map<string, CompiledValueConstraint>

/**
 * Compile exemptions and reject ambiguous normalized component or prop names.
 *
 * @param targets - Configured component groups and exemptions.
 * @returns Conditions indexed by normalized component name.
 * @throws {Error} If names overlap or a value constraint is invalid.
 */
export function compileGenericTargets(
  targets: RequireVueGenericTarget[],
): Map<string, CompiledCondition[]> {
  const result = new Map<string, CompiledCondition[]>()

  for (const target of targets) {
    const conditions = (target.ignoreWhen ?? []).map(condition => {
      const props: CompiledCondition = new Map()

      for (const [name, constraint] of Object.entries(condition.props)) {
        const normalized = validatePropName(name)

        if (props.has(normalized)) {
          throw new Error(`Duplicate exemption prop: "${name}".`)
        }

        props.set(normalized, compileConstraint(name, constraint))
      }

      return props
    })

    for (const name of target.components) {
      const normalized = hyphenateName(name)

      if (result.has(normalized)) {
        throw new Error(`Duplicate generic component target: "${name}".`)
      }

      result.set(normalized, conditions)
    }
  }

  return result
}

/**
 * Match a single exemption using three-valued conjunction across its props.
 *
 * @param condition - Compiled constraints that must all hold.
 * @param bindings - Statically inferred component prop bindings.
 * @returns A definite match, definite mismatch, or unresolved result.
 */
function matchCondition(
  condition: CompiledCondition,
  bindings: Map<string, ComponentPropBinding>,
): MatchResult {
  let unknown = false

  for (const [name, constraint] of condition) {
    const binding = bindings.get(name)

    if (!binding || binding.presence === 'absent') {
      return 'mismatch'
    }

    if (binding.presence === 'unknown') {
      unknown = true
      continue
    }

    let accepts = false
    let rejects = false
    let uncertain =
      binding.value.hasUnknownVariants || !binding.value.variants.length

    for (const variant of binding.value.variants) {
      const failures = getValueFailures(variant, constraint)

      if (failures === undefined) {
        uncertain = true
      } else if (failures.length) {
        rejects = true
      } else {
        accepts = true
      }
    }

    if (rejects && !accepts && !uncertain) {
      return 'mismatch'
    }

    unknown ||= uncertain || rejects
  }

  return unknown ? 'unknown' : 'match'
}

/**
 * Match alternative exemptions; definite matches take precedence over unknowns.
 *
 * @param conditions - Alternative groups of required prop constraints.
 * @param bindings - Statically inferred component prop bindings.
 * @returns Whether any exemption holds or might hold.
 */
export function matchGenericExemptions(
  conditions: CompiledCondition[],
  bindings: Map<string, ComponentPropBinding>,
): MatchResult {
  let unknown = false

  for (const condition of conditions) {
    const result = matchCondition(condition, bindings)

    if (result === 'match') {
      return 'match'
    }

    unknown ||= result === 'unknown'
  }

  return unknown ? 'unknown' : 'mismatch'
}

/**
 * Index generic directives and sibling boundaries once in source order.
 * Ordinary comments do not interrupt a group; the last braced directive wins,
 * including an empty directive. HTML pre ancestors preserve whitespace as a
 * boundary. Type syntax and resolution remain unchecked.
 *
 * @param fragment - The immutable Vue document with comments in source order.
 * @returns A matcher for elements associated with nonempty braced directives,
 * independent of lookup order.
 */
export function createVueGenericCommentMatcher(
  fragment: AST.VDocumentFragment | null | undefined,
): (node: AST.VElement) => boolean {
  const directives = (fragment?.comments ?? []).flatMap(comment => {
    if (comment.type !== 'HTMLComment') {
      return []
    }

    const match = /^\s*@vue-generic\b([\s\S]*)$/u.exec(comment.value)
    const text = match?.[1]?.trim()

    if (!text?.startsWith('{') || !text.endsWith('}')) {
      return []
    }

    const [start, end] = comment.range

    return [{ start, end, hasContent: !!text.slice(1, -1).trim() }]
  })
  const matches = new WeakSet<AST.VElement>()

  if (!fragment || !directives.length) {
    return node => matches.has(node)
  }

  let cursor = 0

  function visit(element: AST.VElement, inPre = false) {
    const preservesWhitespace =
      inPre ||
      (element.rawName === 'pre' &&
        element.namespace === 'http://www.w3.org/1999/xhtml')
    let start = element.startTag.range[1]

    for (const child of element.children) {
      if (child.type === 'VElement') {
        const end = child.range[0]

        // Preorder traversal visits element starts monotonically, including
        // nested elements. Each directive is advanced past at most once.
        while (cursor < directives.length) {
          const directive = directives[cursor]

          if (!directive || directive.end > end) {
            break
          }

          cursor++
        }

        const directive = directives[cursor - 1]

        if (directive?.hasContent && directive.start >= start) {
          matches.add(child)
        }

        visit(child, preservesWhitespace)
      }

      if (
        child.type !== 'VText' ||
        preservesWhitespace ||
        /[^\t\r\n\f ]/u.test(child.value)
      ) {
        start = child.range[1]
      }
    }
  }

  // Root SFC blocks cannot inherit a generic from a document-level comment.
  for (const child of fragment.children) {
    if (child.type === 'VElement') {
      visit(child)
    }
  }

  return node => matches.has(node)
}
