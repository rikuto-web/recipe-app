import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { DifficultyFilter } from '#/components/DifficultyFilter'

describe('DifficultyFilter', () => {
  it('opens star options instead of text labels', () => {
    render(
      <form>
        <DifficultyFilter />
      </form>,
    )

    fireEvent.click(screen.getByRole('button', { name: '難易度' }))

    expect(screen.getByRole('button', { name: '難易度 1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '難易度 3' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '難易度 5' })).toBeInTheDocument()
    expect(screen.queryByText('とても簡単')).not.toBeInTheDocument()
    expect(document.querySelectorAll('.lucide-star').length).toBeGreaterThanOrEqual(25)
  })

  it('shows selected difficulty as stars in the trigger', () => {
    render(
      <form>
        <DifficultyFilter defaultValue={3} />
      </form>,
    )

    expect(screen.getByLabelText('難易度 3/5')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: '難易度' }).querySelector('.lucide-star'),
    ).not.toBeNull()
  })
})
