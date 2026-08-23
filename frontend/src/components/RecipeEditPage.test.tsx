import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { RecipeEditPage } from '#/components/RecipeEditPage'
import {
  createIngredient,
  createStep,
  deleteIngredient,
  deleteStep,
  updateIngredient,
  updateRecipe,
  updateStep,
} from '#/lib/api'
import type { RecipeDetail } from '#/lib/api'

const navigate = vi.hoisted(() => vi.fn())

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    params,
    children,
    ...props
  }: {
    to: string
    params?: { id?: string }
    children: React.ReactNode
  }) => (
    <a
      href={
        typeof to === 'string' && to.includes('$id') && params?.id
          ? to.replace('$id', params.id)
          : to
      }
      {...props}
    >
      {children}
    </a>
  ),
  useNavigate: () => navigate,
}))

vi.mock('#/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('#/lib/api')>()
  return {
    ...actual,
    updateRecipe: vi.fn(),
    updateIngredient: vi.fn(),
    createIngredient: vi.fn(),
    deleteIngredient: vi.fn(),
    updateStep: vi.fn(),
    createStep: vi.fn(),
    deleteStep: vi.fn(),
  }
})

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

const categories = [
  { id: 1, name: '和食' },
  { id: 3, name: '中華' },
]

function mockSuccessfulSave() {
  vi.mocked(updateRecipe).mockResolvedValue({
    ...recipe,
    title: '味噌ラーメン',
  })
  vi.mocked(updateIngredient).mockResolvedValue({
    id: 10,
    sort_order: 1,
    name: '中華麺',
    quantity: 150,
    unit: 'g',
  })
  vi.mocked(createIngredient).mockResolvedValue({
    id: 12,
    sort_order: 3,
    name: 'ネギ',
    quantity: 10,
    unit: 'g',
  })
  vi.mocked(deleteIngredient).mockResolvedValue()
  vi.mocked(updateStep).mockResolvedValue({
    id: 21,
    step_number: 2,
    body: '麺を al dente になるまで茹でる',
  })
  vi.mocked(createStep).mockResolvedValue({
    id: 22,
    step_number: 3,
    body: '盛り付ける',
  })
  vi.mocked(deleteStep).mockResolvedValue()
}

describe('RecipeEditPage', () => {
  beforeEach(() => {
    navigate.mockReset()
    vi.mocked(updateRecipe).mockReset()
    vi.mocked(updateIngredient).mockReset()
    vi.mocked(createIngredient).mockReset()
    vi.mocked(deleteIngredient).mockReset()
    vi.mocked(updateStep).mockReset()
    vi.mocked(createStep).mockReset()
    vi.mocked(deleteStep).mockReset()
  })

  it('renders existing recipe values without per-row save buttons', () => {
    render(<RecipeEditPage recipe={recipe} categories={categories} />)

    expect(screen.getByRole('heading', { name: 'レシピを編集' })).toBeInTheDocument()
    expect(screen.getByDisplayValue('醤油ラーメン')).toBeInTheDocument()
    expect(screen.getByDisplayValue('中華麺')).toBeInTheDocument()
    expect(screen.getByDisplayValue('スープを作る')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '保存' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '材料 1 を保存' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '手順 1 を保存' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '親情報を保存' })).not.toBeInTheDocument()
  })

  it('saves unchanged rows with PUT only and returns to detail', async () => {
    mockSuccessfulSave()
    vi.mocked(updateRecipe).mockResolvedValue({
      ...recipe,
      title: '味噌ラーメン',
    })

    render(<RecipeEditPage recipe={recipe} categories={categories} />)

    fireEvent.change(screen.getByDisplayValue('醤油ラーメン'), {
      target: { value: '味噌ラーメン' },
    })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))

    await waitFor(() => {
      expect(updateRecipe).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ title: '味噌ラーメン', category_id: 1 }),
      )
    })
    expect(updateIngredient).not.toHaveBeenCalled()
    expect(updateStep).not.toHaveBeenCalled()
    expect(navigate).toHaveBeenCalledWith({
      to: '/recipes/$id',
      params: { id: '1' },
    })
  })

  it('blocks save when title is empty', () => {
    render(<RecipeEditPage recipe={recipe} categories={categories} />)

    fireEvent.change(screen.getByDisplayValue('醤油ラーメン'), {
      target: { value: '' },
    })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))

    expect(screen.getByText('タイトルは必須です')).toBeInTheDocument()
    expect(updateRecipe).not.toHaveBeenCalled()
  })

  it('patches a dirty ingredient on footer save', async () => {
    mockSuccessfulSave()

    render(<RecipeEditPage recipe={recipe} categories={categories} />)

    fireEvent.change(screen.getByLabelText('分量 1'), {
      target: { value: '150' },
    })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))

    await waitFor(() => {
      expect(updateIngredient).toHaveBeenCalledWith(
        1,
        10,
        expect.objectContaining({ quantity: 150, name: '中華麺' }),
      )
    })
    expect(updateRecipe).toHaveBeenCalled()
    expect(navigate).toHaveBeenCalledWith({
      to: '/recipes/$id',
      params: { id: '1' },
    })
  })

  it('patches a dirty step on footer save', async () => {
    mockSuccessfulSave()

    render(<RecipeEditPage recipe={recipe} categories={categories} />)

    fireEvent.change(screen.getByLabelText('手順 2'), {
      target: { value: '麺を al dente になるまで茹でる' },
    })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))

    await waitFor(() => {
      expect(updateStep).toHaveBeenCalledWith(1, 21, {
        body: '麺を al dente になるまで茹でる',
      })
    })
    expect(updateRecipe).toHaveBeenCalled()
  })

  it('posts a newly added ingredient on footer save', async () => {
    mockSuccessfulSave()

    render(<RecipeEditPage recipe={recipe} categories={categories} />)

    fireEvent.click(screen.getAllByRole('button', { name: '行を追加' })[0]!)
    fireEvent.change(screen.getByLabelText('材料名 3'), {
      target: { value: 'ネギ' },
    })
    fireEvent.change(screen.getByLabelText('分量 3'), {
      target: { value: '10' },
    })
    fireEvent.change(screen.getByLabelText('単位 3'), {
      target: { value: 'g' },
    })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))

    await waitFor(() => {
      expect(createIngredient).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ name: 'ネギ', quantity: 10, unit: 'g' }),
      )
    })
    expect(updateRecipe).toHaveBeenCalled()
  })

  it('posts a newly added step on footer save', async () => {
    mockSuccessfulSave()

    render(<RecipeEditPage recipe={recipe} categories={categories} />)

    fireEvent.click(screen.getAllByRole('button', { name: '行を追加' })[1]!)
    fireEvent.change(screen.getByLabelText('手順 3'), {
      target: { value: '盛り付ける' },
    })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))

    await waitFor(() => {
      expect(createStep).toHaveBeenCalledWith(1, { body: '盛り付ける' })
    })
    expect(updateRecipe).toHaveBeenCalled()
  })

  it('deletes a removed ingredient only when footer save is pressed', async () => {
    mockSuccessfulSave()

    render(<RecipeEditPage recipe={recipe} categories={categories} />)

    fireEvent.click(screen.getByRole('button', { name: '材料 2 を削除' }))
    expect(deleteIngredient).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: '保存' }))

    await waitFor(() => {
      expect(deleteIngredient).toHaveBeenCalledWith(1, 11)
    })
    expect(updateRecipe).toHaveBeenCalled()
  })

  it('renders Lucide icons for edit actions', () => {
    render(<RecipeEditPage recipe={recipe} categories={categories} />)

    expect(document.querySelector('.lucide-pencil')).not.toBeNull()
    expect(document.querySelector('.lucide-save')).not.toBeNull()
    expect(document.querySelector('.lucide-plus')).not.toBeNull()
    expect(document.querySelector('.lucide-trash-2')).not.toBeNull()
  })
})
