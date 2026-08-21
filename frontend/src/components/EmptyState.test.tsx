import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { EmptyState } from '#/components/EmptyState'

describe('EmptyState', () => {
  it('renders UtensilsCrossed icon, title, and description', () => {
    render(
      <EmptyState
        title="条件に一致するレシピがありません"
        description="条件を変えて検索してください"
      />,
    )

    expect(
      screen.getByRole('heading', {
        name: '条件に一致するレシピがありません',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('条件を変えて検索してください'),
    ).toBeInTheDocument()
    expect(
      document.querySelector('.lucide-utensils-crossed'),
    ).not.toBeNull()
  })
})
