import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { RecipeListPage } from '#/components/RecipeListPage'
import type { Category, RecipeSummary } from '#/lib/api'

const categories: Category[] = [
  { id: 1, name: '和食' },
  { id: 3, name: '中華' },
]

const recipe: RecipeSummary = {
  id: 1,
  title: '醤油ラーメン',
  category: { id: 3, name: '中華' },
  servings: 2,
  cook_time_minutes: 30,
  difficulty: 3,
  created_at: '2026-03-01T00:00:00Z',
  updated_at: '2026-03-01T00:00:00Z',
}

describe('RecipeListPage', () => {
  it('shows a filtered empty state', () => {
    render(
      <RecipeListPage
        recipes={[]}
        total={0}
        categories={categories}
        filters={{ q: '存在しない' }}
        onSubmit={vi.fn()}
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
    expect(screen.getByText('該当 0 件')).toBeInTheDocument()
  })

  it('renders a card grid and filter controls with Lucide icons', () => {
    render(
      <RecipeListPage
        recipes={[recipe]}
        total={1}
        categories={categories}
        filters={{}}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.getByText('該当 1 件')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: '醤油ラーメン' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: 'キーワード' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '検索' })).toBeInTheDocument()
    expect(document.querySelector('.lucide-search')).not.toBeNull()
    expect(
      document.querySelector('.lucide-sliders-horizontal'),
    ).not.toBeNull()
  })
})
