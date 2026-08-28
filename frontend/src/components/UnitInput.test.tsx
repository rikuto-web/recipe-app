import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { UnitInput } from '#/components/UnitInput'

describe('UnitInput', () => {
  it('shows suggestions below the input and selects a value', () => {
    const onChange = vi.fn()

    render(<UnitInput value="" onChange={onChange} suggestions={['g', 'ml']} />)

    fireEvent.focus(screen.getByRole('combobox'))
    expect(screen.getByRole('listbox')).toBeInTheDocument()

    fireEvent.mouseDown(screen.getByRole('option', { name: 'g' }))
    expect(onChange).toHaveBeenCalledWith('g')
  })

  it('opens suggestions from the toggle button', () => {
    render(<UnitInput value="" onChange={vi.fn()} suggestions={['g']} />)

    fireEvent.click(screen.getByRole('button', { name: '単位候補を表示' }))
    expect(screen.getByRole('listbox')).toBeInTheDocument()
  })

  it('shows all suggestions from the toggle even when a value is already set', () => {
    render(
      <UnitInput value="g" onChange={vi.fn()} suggestions={['g', 'ml', '個']} />,
    )

    fireEvent.click(screen.getByRole('button', { name: '単位候補を表示' }))

    expect(screen.getByRole('option', { name: 'ml' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: '個' })).toBeInTheDocument()
  })

  it('lets users switch units without clearing the field first', () => {
    const onChange = vi.fn()

    render(
      <UnitInput value="g" onChange={onChange} suggestions={['g', 'ml', '個']} />,
    )

    fireEvent.click(screen.getByRole('button', { name: '単位候補を表示' }))
    fireEvent.mouseDown(screen.getByRole('option', { name: 'ml' }))

    expect(onChange).toHaveBeenCalledWith('ml')
  })
})
