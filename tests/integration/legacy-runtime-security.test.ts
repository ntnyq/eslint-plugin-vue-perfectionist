import { expect, it, vi } from 'vitest'
import { ssrRenderAttrs } from 'vue-runtime-legacy/server-renderer'

it('rejects carriage returns in legacy SSR attribute names', () => {
  const error = vi.spyOn(console, 'error').mockImplementation(() => {})
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  try {
    expect(ssrRenderAttrs({ 'x\ry': 'blocked' })).toBe('')
    expect(ssrRenderAttrs({ title: 'safe' })).toBe(' title="safe"')
  } finally {
    error.mockRestore()
    warn.mockRestore()
  }
})
