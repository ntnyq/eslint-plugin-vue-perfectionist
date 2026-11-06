import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DemoModeData } from './build-demo'

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  vi.doUnmock('./modes/natural.data')
  vi.doUnmock('./modes/alphabetical.data')
})

describe('lazy sorting results', () => {
  it('loads only the selected mode and shares in-flight and completed requests', async () => {
    const naturalData: DemoModeData = []
    const alphabeticalData: DemoModeData = []
    const naturalFactory = vi.fn(() => ({
      data: naturalData,
    }))
    const alphabeticalFactory = vi.fn(() => ({
      data: alphabeticalData,
    }))
    vi.doMock('./modes/natural.data', naturalFactory)
    vi.doMock('./modes/alphabetical.data', alphabeticalFactory)

    const { loadDemoVariants } = await import('./load-variants')
    expect(naturalFactory).not.toHaveBeenCalled()
    expect(alphabeticalFactory).not.toHaveBeenCalled()

    const first = loadDemoVariants('natural')
    expect(loadDemoVariants('natural')).toBe(first)
    await expect(first).resolves.toBe(naturalData)
    await expect(loadDemoVariants('natural')).resolves.toBe(naturalData)
    expect(naturalFactory).toHaveBeenCalledOnce()
    expect(alphabeticalFactory).not.toHaveBeenCalled()

    await expect(loadDemoVariants('alphabetical')).resolves.toBe(
      alphabeticalData,
    )
    expect(alphabeticalFactory).toHaveBeenCalledOnce()
  })

  it('does not cache failed imports permanently', async () => {
    vi.doMock('./modes/natural.data', () => {
      throw new Error('Preview unavailable')
    })
    const { loadDemoVariants } = await import('./load-variants')
    await expect(loadDemoVariants('natural')).rejects.toThrow()

    const recovered: DemoModeData = []
    vi.doMock('./modes/natural.data', () => ({
      data: recovered,
    }))
    await expect(loadDemoVariants('natural')).resolves.toBe(recovered)
  })
})
