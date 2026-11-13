import { describe, expect, expectTypeOf, it } from 'vitest'
import { inferExpressionValueShape } from '../../src/utils/ast/value-analysis.ts'
import { inferStaticPropValue } from '../../src/utils/component-props/static-value.ts'
import { createSourceCode } from '../helpers/source-code.ts'
import type { ComponentPropType } from '../../src/index.ts'
import type { ExpressionValueVariant } from '../../src/utils/ast/value-analysis.ts'

function expression(code: string) {
  const statement = createSourceCode(`(${code})`).ast.body[0]
  if (statement?.type !== 'ExpressionStatement') {
    throw new Error('Expected an expression fixture.')
  }
  return statement.expression
}

describe('shared expression value evidence', () => {
  it('retains known branches independently of unresolved possibilities', () => {
    const node = expression('ok ? ("ready" as string) : external')
    expect(inferExpressionValueShape(node, () => false)).toMatchObject({
      variants: [{ type: 'string', value: 'ready' }],
      hasUnknownVariants: true,
      node,
    })
  })

  it('keeps concrete arithmetic exclusive to the prop constraint analyzer', () => {
    const node = expression('2 + 3')
    expect(inferExpressionValueShape(node, () => false)).toMatchObject({
      variants: [],
      hasUnknownVariants: true,
    })
    expect(inferStaticPropValue(node, () => false)).toMatchObject({
      variants: [{ type: 'number', value: 5 }],
      hasUnknownVariants: false,
    })
  })

  it.each([
    { code: 'false', type: 'boolean', value: false },
    { code: '0', type: 'number', value: 0 },
    { code: '""', type: 'string', value: '' },
    { code: 'null', type: 'null', value: null },
  ])(
    'retains the concrete $type scalar without losing falsy values',
    ({ code, type, value }) => {
      expect(inferStaticPropValue(expression(code), () => false)).toMatchObject(
        {
          variants: [{ type, value }],
          hasUnknownVariants: false,
        },
      )
    },
  )

  it('requires explicit scope evidence before recognizing global undefined', () => {
    const node = expression('undefined')
    expect(
      inferExpressionValueShape(node, () => false).hasUnknownVariants,
    ).toBe(true)
    expect(
      inferExpressionValueShape(node, candidate => candidate === node),
    ).toMatchObject({
      variants: [{ type: 'undefined' }],
      hasUnknownVariants: false,
    })
  })

  it('ties concrete scalar types to their runtime kinds', () => {
    expectTypeOf<
      ExpressionValueVariant['type']
    >().toEqualTypeOf<ComponentPropType>()
    expectTypeOf<{
      type: 'number'
      value: string
    }>().not.toExtend<ExpressionValueVariant>()
    expectTypeOf<{
      type: 'string'
      value: number
    }>().not.toExtend<ExpressionValueVariant>()
    expectTypeOf<{
      type: 'object'
      value: boolean
    }>().not.toExtend<ExpressionValueVariant>()
  })
})
