import { expect, it } from 'vitest'
import { AST, parseForESLint } from 'vue-eslint-parser'
import { createVueGenericCommentMatcher } from '../../src/utils/vue-generic.ts'

function parseDocument(source: string): AST.VDocumentFragment {
  const parsed = parseForESLint(source, { range: true, loc: true })
  const fragment = parsed.services?.getDocumentFragment()
  if (!fragment) {
    throw new Error('Expected a Vue document fragment.')
  }
  return fragment
}

it('keeps nested associations independent of lookup order and other files', () => {
  const fragment = parseDocument(`<template>
<!-- @vue-generic {Outer} --><MyList>
  <!-- @vue-generic {Inner} --><MyList />
</MyList>
<!-- @vue-generic {Discarded} --><!-- @vue-generic {} --><MyList />
<!-- @vue-generic {Next} --><!-- @vue-generic malformed --><MyList />
<MyList />
</template>`)
  const elements: AST.VElement[] = []
  AST.traverseNodes(fragment, {
    enterNode(node) {
      if (node.type === 'VElement' && node.rawName === 'MyList') {
        elements.push(node)
      }
    },
    leaveNode() {},
  })
  const hasComment = createVueGenericCommentMatcher(fragment)
  const expected = [true, true, false, true, false]
  expect(elements.toReversed().map(hasComment)).toEqual(expected.toReversed())

  const otherDocument = parseDocument('<template><MyList /></template>')
  const hasOtherComment = createVueGenericCommentMatcher(otherDocument)
  expect(elements.map(hasOtherComment)).toEqual(elements.map(() => false))
  expect(elements.map(hasComment)).toEqual(expected)
})

it.each([64, 256, 1024])(
  'indexes generic comments and sibling boundaries across %i components',
  size => {
    const source = `<template>${Array.from(
      { length: size },
      () =>
        '<!-- @vue-generic {Item} --><!-- ordinary comment -->\n<MyList /><MyList />',
    ).join('\n')}</template>`
    const fragment = parseDocument(source)
    const elements: AST.VElement[] = []
    let nodeRangeReads = 0
    let commentReads = 0
    AST.traverseNodes(fragment, {
      enterNode(node) {
        if (node.type === 'VElement' && node.rawName === 'MyList') {
          elements.push(node)
        }
        const range = node.range
        Object.defineProperty(node, 'range', {
          configurable: true,
          get() {
            nodeRangeReads++
            return range
          },
        })
      },
      leaveNode() {},
    })
    for (const comment of fragment.comments) {
      const range = comment.range
      const value = comment.value
      Object.defineProperties(comment, {
        range: {
          configurable: true,
          get() {
            commentReads++
            return range
          },
        },
        value: {
          configurable: true,
          get() {
            commentReads++
            return value
          },
        },
      })
    }
    // Measure indexing and lookups together, independent of CI scheduling.
    nodeRangeReads = 0
    const hasComment = createVueGenericCommentMatcher(fragment)
    expect(elements.map(hasComment)).toEqual(
      Array.from({ length: size * 2 }, (_, index) => index % 2 === 0),
    )
    expect(nodeRangeReads).toBeLessThan(size * 32)
    expect(commentReads).toBeLessThan(size * 16)
  },
)
