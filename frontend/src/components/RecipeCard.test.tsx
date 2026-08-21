import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { RecipeCard } from '#/components/RecipeCard'
import type { RecipeSummary } from '#/lib/api'

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

describe('RecipeCard', () => {
  it('renders title, category, cook time, servings, and difficulty stars', () => {
    render(<RecipeCard recipe={recipe} />)

    expect(
      screen.getByRole('heading', { name: '醤油ラーメン' }),
    ).toBeInTheDocument()
    expect(screen.getByText('中華')).toBeInTheDocument()
    expect(screen.getByText('30分')).toBeInTheDocument()
    expect(screen.getByText('2人分')).toBeInTheDocument()
    expect(screen.getByLabelText('難易度 3/5')).toBeInTheDocument()
    expect(document.querySelector('.lucide-clock')).not.toBeNull()
    expect(document.querySelector('.lucide-users')).not.toBeNull()
    expect(document.querySelector('.lucide-tag')).not.toBeNull()
  })
})
