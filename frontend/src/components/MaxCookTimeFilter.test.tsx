import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { MaxCookTimeFilter } from '#/components/MaxCookTimeFilter'

describe('MaxCookTimeFilter', () => {
  it('snaps the default value from URL to match parseRecipeSearch', () => {
    render(
      <form>
        <MaxCookTimeFilter defaultValue={25} />
      </form>,
    )

    expect(screen.getByLabelText('調理時間上限')).toHaveValue('30')
    expect(
      (document.querySelector('input[name="max_cook_time"]') as HTMLInputElement)
        .value,
    ).toBe('30')
  })

  it('increments and decrements by 10 minutes', () => {
    render(
      <form>
        <MaxCookTimeFilter />
      </form>,
    )

    fireEvent.click(screen.getByRole('button', { name: '上限を10分増やす' }))
    expect(screen.getByLabelText('調理時間上限')).toHaveValue('10')

    fireEvent.click(screen.getByRole('button', { name: '上限を10分増やす' }))
    expect(screen.getByLabelText('調理時間上限')).toHaveValue('20')

    fireEvent.click(screen.getByRole('button', { name: '上限を10分減らす' }))
    expect(screen.getByLabelText('調理時間上限')).toHaveValue('10')

    fireEvent.click(screen.getByRole('button', { name: '上限を10分減らす' }))
    expect(screen.getByLabelText('調理時間上限')).toHaveValue('')
  })
})
