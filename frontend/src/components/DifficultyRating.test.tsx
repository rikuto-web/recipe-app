/**
 * VS-00: DifficultyRating の描画テスト（docs/09-development-guide.md §3.3）。
 * value=3 のとき filled Star が 3 個になることを検証する。
 */
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { DifficultyRating } from '#/components/DifficultyRating'

describe('DifficultyRating', () => {
  it('renders 3 filled Star icons', () => {
    render(<DifficultyRating value={3} />)

    const stars = screen.getAllByRole('img', { hidden: true })
    expect(stars).toHaveLength(5)

    const filledStars = stars.filter((star) =>
      star.classList.contains('fill-star'),
    )
    expect(filledStars).toHaveLength(3)
  })
})
