import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { MaxCookTimeFilter } from '#/components/MaxCookTimeFilter'

describe('MaxCookTimeFilter', () => {
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
