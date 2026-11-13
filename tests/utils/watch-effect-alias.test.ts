import { expect, it } from 'vitest'
import { unwrapExpression } from '../../src/utils/ast/expressions.ts'
import { getCallIdentity } from '../../src/utils/vue/call-identity.ts'
import { createWatchEffectAliasFixPlanner } from '../../src/utils/watch-effect-alias.ts'
import { createSourceCode } from '../helpers/source-code.ts'

function plan(code: string, sources = ['vue']) {
  const sourceCode = createSourceCode(code)
  const statement = sourceCode.ast.body.at(-1)
  if (
    statement?.type !== 'ExpressionStatement' ||
    statement.expression.type !== 'CallExpression'
  ) {
    throw new Error('Expected a call fixture.')
  }
  const call = statement.expression
  const argument = call.arguments[1]
  const object = argument && unwrapExpression(argument)
  const identity = getCallIdentity(call, sourceCode)
  if (object?.type !== 'ObjectExpression' || !identity) {
    throw new Error('Expected recognized options and call identity.')
  }
  const result = createWatchEffectAliasFixPlanner(
    sourceCode,
    new Set(sources),
    undefined,
  )(call, object, identity, 'watchPostEffect')
  expect(sourceCode.text).toBe(code)
  expect(call.arguments[1]).toBe(argument)
  return result
}

it('plans independent import, callee, and options edits without mutating source', () => {
  const code =
    "import { watchEffect } from 'vue'; watchEffect(update, { flush: 'post', onTrack: debug })"
  const result = plan(code)
  expect(result.safe).toBe(true)
  if (!result.safe) {
    throw new Error(result.reason)
  }
  let output = code
  for (const edit of result.edits.toSorted(
    (left, right) => right.range[0] - left.range[0],
  )) {
    output =
      output.slice(0, edit.range[0]) + edit.text + output.slice(edit.range[1])
  }
  expect(output).toBe(
    "import { watchEffect, watchPostEffect } from 'vue'; watchPostEffect(update, {  onTrack: debug })",
  )
})

it.each([
  {
    expression: "watchEffect(update, ({ flush: 'post' } as Options))",
    reason: 'options-contract',
  },
  {
    expression: "watchEffect(update, { flush: 'pre', flush: 'post' })",
    reason: 'options-properties',
  },
  {
    expression: "(watchEffect as Function)(update, { flush: 'post' })",
    reason: 'callee-contract',
  },
  {
    expression:
      "watchPostEffect(other); watchEffect(update, { flush: 'post' })",
    reason: 'alias-binding',
  },
])(
  'keeps $reason failures report-only with no partial edits',
  ({ expression, reason }) => {
    expect(plan(`import { watchEffect } from 'vue'; ${expression}`)).toEqual({
      safe: false,
      reason,
    })
  },
)

it('requires export evidence before changing a custom namespace member', () => {
  expect(
    plan(
      "import * as Vue from '#imports'; Vue.watchEffect(update, { flush: 'post' })",
      ['#imports'],
    ),
  ).toEqual({ safe: false, reason: 'alias-export' })
})
