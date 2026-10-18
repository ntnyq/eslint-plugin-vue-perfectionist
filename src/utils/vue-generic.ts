import { hyphenateName, validatePropName } from './component-props/config.ts'
import {
  compileConstraint,
  getValueFailures,
} from './component-props/constraints.ts'
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
    let uncertain = binding.value.unknown || !binding.value.variants.length
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
 * Associate a generic directive in the preceding sibling comment group.
 * Ordinary comments do not interrupt it; the last braced directive wins,
 * matching Vue Language Tools. Type syntax and resolution remain unchecked.
 *
 * @param node - The component usage requiring an explicit generic.
 * @param comments - Document comments in source order.
 * @returns Whether the associated directive has nonempty braced content.
 */
export function hasVueGenericComment(
  node: AST.VElement,
  comments: AST.Token[],
): boolean {
  if (node.parent.type !== 'VElement') {
    return false
  }
  let ancestor: AST.VElement | AST.VDocumentFragment = node.parent
  let preservesWhitespace = false
  while (ancestor.type === 'VElement') {
    if (ancestor.rawName === 'pre') {
      preservesWhitespace = true
      break
    }
    ancestor = ancestor.parent
  }
  const previous = node.parent.children.findLast(
    sibling =>
      sibling.range[1] <= node.range[0] &&
      (sibling.type !== 'VText' ||
        preservesWhitespace ||
        /[^\t\r\n\f ]/u.test(sibling.value)),
  )
  const start = previous?.range[1] ?? node.parent.startTag.range[1]
  let generic = ''
  for (const comment of comments) {
    if (
      comment.type !== 'HTMLComment' ||
      comment.range[0] < start ||
      comment.range[1] > node.range[0]
    ) {
      continue
    }
    const match = /^\s*@vue-generic\b([\s\S]*)$/u.exec(comment.value)
    const text = match?.[1]?.trim()
    if (text?.startsWith('{') && text.endsWith('}')) {
      generic = text.slice(1, -1).trim()
    }
  }
  return !!generic
}
