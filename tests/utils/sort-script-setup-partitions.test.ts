import { expect, it } from 'vitest'
import { DEFAULT_OPTIONS } from '../../src/utils/sort-script-setup/constants.ts'
import { createPartitionCollector } from '../../src/utils/sort-statements/partitions.ts'
import { createSourceCode } from '../helpers/source-code.ts'

it('indexes contained comments without rescanning every comment for each statement', () => {
  const size = 256
  const chunks = Array.from(
    { length: size },
    (_, index) =>
      `// leading ${index}\nconst value${index} = /* inside ${index} */ 0 // trailing ${index}`,
  )
  const sourceCode = createSourceCode(chunks.join('\n'))
  let rangeReads = 0
  for (const comment of sourceCode.getAllComments()) {
    const range = comment.range
    Object.defineProperty(comment, 'range', {
      configurable: true,
      get() {
        rangeReads++
        return range
      },
    })
  }
  const partitions = createPartitionCollector(
    sourceCode,
    DEFAULT_OPTIONS,
    () => true,
    () => false,
  )(sourceCode.ast.body)
  expect(partitions).toHaveLength(1)
  expect(
    partitions
      .flat()
      .map(statement => sourceCode.text.slice(statement.start, statement.end)),
  ).toEqual(chunks)
  expect(rangeReads).toBeLessThan(size * Math.ceil(Math.log2(size)) * 20)
})
