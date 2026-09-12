import { Linter } from 'eslint'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { DEFAULT_OPTIONS } from '../../../../../src/constants/sort-script-setup'
import * as classification from '../../../../../src/utils/classify'
import { buildDemo, createDemoConfig } from './build-demo'
import type { DemoData } from './build-demo'

let data: DemoData

beforeAll(async () => {
  data = await buildDemo()
})

function getExample(id: string) {
  const example = data.find(item => item.id === id)
  if (!example) {
    throw new Error(`Missing demo example: ${id}`)
  }
  return example
}

describe('sort-script-setup demo', () => {
  it('classifies every default group type in the complete component example', () => {
    const classify = vi.spyOn(classification, 'classifyStatement')

    try {
      const linter = new Linter()
      linter.verify(
        getExample('all-groups').code,
        createDemoConfig({}),
        'Demo.vue',
      )

      const selectors = new Set(
        classify.mock.results.flatMap(result =>
          result.type === 'return' && result.value
            ? [result.value.selector]
            : [],
        ),
      )

      expect([...selectors].sort()).toEqual(
        DEFAULT_OPTIONS.groups.flat().sort(),
      )
    } finally {
      classify.mockRestore()
    }
  })

  it('sorts safe fragments of the complete example while preserving runtime order', () => {
    const example = getExample('all-groups')

    for (const variant of example.variants) {
      expect(variant.code.indexOf('computed(()')).toBeLessThan(
        variant.code.indexOf('ref(props.initialCount)'),
      )
      expect(variant.messages).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ messageId: 'unsafeReorder' }),
        ]),
      )
    }

    const natural = example.variants.find(
      variant => variant.type === 'natural' && variant.order === 'asc',
    )
    if (!natural) {
      throw new Error('Missing ascending natural sorting variant')
    }
    expect(natural.code.indexOf('const item2 =')).toBeLessThan(
      natural.code.indexOf('const item10 ='),
    )
    expect(natural.code.indexOf('function reset()')).toBeLessThan(
      natural.code.indexOf('function submit()'),
    )
  })

  it('distinguishes group-only, alphabetical, natural, and length sorting', () => {
    const example = getExample('grouping')
    const expectedConstants = {
      unsorted: ['item10', 'item2', 'active'],
      alphabetical: ['active', 'item10', 'item2'],
      natural: ['active', 'item2', 'item10'],
      'line-length': ['item2', 'active', 'item10'],
    }

    for (const variant of example.variants) {
      const constants = [...variant.code.matchAll(/const (\w+)/g)].map(
        match => match[1],
      )
      const expected = expectedConstants[variant.type]

      expect(constants).toEqual(
        variant.order === 'desc' && variant.type !== 'unsorted'
          ? expected.toReversed()
          : expected,
      )
      expect(variant.messages).toEqual([])
      expect(variant.code.indexOf('interface Props')).toBeLessThan(
        variant.code.indexOf('const '),
      )
      expect(variant.code.lastIndexOf('const ')).toBeLessThan(
        variant.code.indexOf('function '),
      )
    }
  })

  it('keeps runtime calls in place and exposes unsafe reorder diagnostics', () => {
    for (const variant of getExample('runtime').variants) {
      expect(variant.code.indexOf('computed(()')).toBeLessThan(
        variant.code.indexOf('ref(0)'),
      )
      expect(variant.code).toBe(getExample('runtime').code)
      expect(variant.messages).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            messageId: 'unsafeReorder',
            message: expect.stringContaining('"count" (ref / reactive)'),
          }),
        ]),
      )
    }
  })

  it('preserves initialization dependencies', () => {
    for (const variant of getExample('dependencies').variants) {
      const callIndex = variant.code.indexOf('const value = getLabel()')

      expect(variant.code.indexOf('function getLabel()')).toBeLessThan(
        callIndex,
      )
      expect(variant.code.indexOf("const label = 'Ready'")).toBeLessThan(
        callIndex,
      )
    }
  })

  it('produces idempotent fixes and tokens that exactly match displayed source', () => {
    const linter = new Linter()

    for (const example of data) {
      for (const result of [example.initial, ...example.variants]) {
        expect(
          result.tokens.tokens
            .map(token => token.content)
            .join('')
            .trimEnd(),
        ).toBe(result.code.trimEnd())
      }
      for (const variant of example.variants) {
        const fixed = linter.verifyAndFix(
          variant.code,
          createDemoConfig(variant.options),
          { filename: 'Demo.vue' },
        )

        expect(fixed.fixed).toBe(false)
        expect(fixed.output).toBe(variant.code)
      }
    }
  })
})
