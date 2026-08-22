import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { CookTimeStepper } from '#/components/CookTimeStepper'

describe('CookTimeStepper', () => {
  it('changes value in 10-minute steps', () => {
    const onChange = vi.fn()

    render(<CookTimeStepper value={30} onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: '調理時間を10分増やす' }))
    expect(onChange).toHaveBeenCalledWith(40)

    fireEvent.click(screen.getByRole('button', { name: '調理時間を10分減らす' }))
    expect(onChange).toHaveBeenLastCalledWith(20)
  })

  it('allows clearing the value when allowEmpty is true', () => {
    const onChange = vi.fn()

    render(<CookTimeStepper value={10} onChange={onChange} allowEmpty />)

    fireEvent.click(screen.getByRole('button', { name: '調理時間を10分減らす' }))
    expect(onChange).toHaveBeenCalledWith('')
  })

  it('does not go below minMinutes when allowEmpty is false', () => {
    const onChange = vi.fn()

    render(<CookTimeStepper value={10} onChange={onChange} minMinutes={10} />)

    expect(
      screen.getByRole('button', { name: '調理時間を10分減らす' }),
    ).toBeDisabled()
  })
})
