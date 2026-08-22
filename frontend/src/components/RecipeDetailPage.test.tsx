import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import {
  RecipeDetailPage,
  RecipeNotFound,
} from '#/components/RecipeDetailPage'
import type { RecipeDetail } from '#/lib/api'

const recipe: RecipeDetail = {
  id: 1,
  title: '醤油ラーメン',
  description: 'シンプルな醤油ラーメン',
  category: { id: 1, name: '和食' },
  servings: 2,
  cook_time_minutes: 30,
  difficulty: 3,
  ingredients: [
    { id: 10, sort_order: 1, name: '中華麺', quantity: 120, unit: 'g' },
    { id: 11, sort_order: 2, name: '豚バラ', quantity: 80, unit: 'g' },
  ],
  steps: [
    { id: 20, step_number: 1, body: 'スープを作る' },
    { id: 21, step_number: 2, body: '麺を茹でる' },
  ],
  created_at: '2026-08-21T00:00:00Z',
  updated_at: '2026-08-21T00:00:00Z',
}

describe('RecipeDetailPage', () => {
  it('renders title, meta, ingredients, steps, and required Lucide icons', () => {
    render(<RecipeDetailPage recipe={recipe} />)

    expect(
      screen.getByRole('heading', { name: '醤油ラーメン' }),
    ).toBeInTheDocument()
    expect(screen.getByText('シンプルな醤油ラーメン')).toBeInTheDocument()
    expect(screen.getByText('和食')).toBeInTheDocument()
    expect(screen.getByText('30分')).toBeInTheDocument()
    expect(screen.getByLabelText('難易度 3/5')).toBeInTheDocument()
    expect(screen.getByText('中華麺')).toBeInTheDocument()
    expect(screen.getByText('120 g')).toBeInTheDocument()
    expect(screen.getByText('豚バラ')).toBeInTheDocument()
    expect(screen.getByText('80 g')).toBeInTheDocument()
    expect(screen.getByText('スープを作る')).toBeInTheDocument()
    expect(screen.getByText('麺を茹でる')).toBeInTheDocument()

    expect(screen.getByRole('link', { name: /一覧/ })).toHaveAttribute(
      'href',
      '/recipes',
    )
    expect(document.querySelector('.lucide-arrow-left')).not.toBeNull()
    expect(document.querySelector('.lucide-pencil')).not.toBeNull()
    expect(document.querySelector('.lucide-clock')).not.toBeNull()
    expect(document.querySelector('.lucide-users')).not.toBeNull()
    expect(document.querySelector('.lucide-carrot')).not.toBeNull()
    expect(document.querySelector('.lucide-list-ordered')).not.toBeNull()
  })

  it('scales ingredient quantities on the client when servings change', () => {
    render(<RecipeDetailPage recipe={recipe} />)

    fireEvent.click(screen.getByRole('button', { name: '1人増やす' }))
    fireEvent.click(screen.getByRole('button', { name: '1人増やす' }))

    expect(screen.getByText('240 g')).toBeInTheDocument()
    expect(screen.getByText('160 g')).toBeInTheDocument()
    expect(screen.queryByText('120 g')).not.toBeInTheDocument()
  })
})

describe('RecipeNotFound', () => {
  it('shows a 404 message and a link back to the list', () => {
    render(<RecipeNotFound />)

    expect(
      screen.getByRole('heading', { name: 'レシピが見つかりません' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /一覧へ戻る/ }),
    ).toHaveAttribute('href', '/recipes')
  })
})
