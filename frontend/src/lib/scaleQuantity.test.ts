import { describe, expect, it } from 'vitest'

import { formatQuantity, scaleQuantity } from '#/lib/scaleQuantity'

describe('scaleQuantity', () => {
  it('scales 120 from 2 servings to 4 servings as 240', () => {
    expect(scaleQuantity(120, 2, 4)).toBe(240)
  })

  it('scales down without reaching zero when display servings is 1', () => {
    expect(scaleQuantity(120, 2, 1)).toBe(60)
  })
})

describe('formatQuantity', () => {
  it('renders whole numbers without decimals', () => {
    expect(formatQuantity(240)).toBe('240')
  })

  it('rounds repeating decimals to two places', () => {
    expect(formatQuantity(100 / 3)).toBe('33.33')
  })
})
