import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { RecipeCreatePage } from '#/components/RecipeCreatePage'
import { ApiValidationError, createRecipe } from '#/lib/api'

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    children,
    ...props
  }: {
    to: string
    children: React.ReactNode
  }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useNavigate: () => vi.fn(),
}))

vi.mock('#/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('#/lib/api')>()
  return {
    ...actual,
    createRecipe: vi.fn(),
  }
})

const categories = [
  { id: 1, name: '和食' },
  { id: 3, name: '中華' },
]

function getStepBodyInput(index = 0) {
  return document.getElementById(`steps-${index}-body`) as HTMLTextAreaElement
}

function fillValidForm() {
  fireEvent.change(screen.getByPlaceholderText('例: 醤油ラーメン'), {
    target: { value: '醤油ラーメン' },
  })
  fireEvent.change(screen.getByRole('combobox', { name: 'カテゴリ' }), {
    target: { value: '1' },
  })
  fireEvent.change(screen.getByLabelText('材料名'), {
    target: { value: '中華麺' },
  })
  fireEvent.change(screen.getByLabelText('分量'), {
    target: { value: '120' },
  })
  fireEvent.change(screen.getByPlaceholderText('g'), {
    target: { value: 'g' },
  })
  fireEvent.change(getStepBodyInput(0), {
    target: { value: 'スープを作る' },
  })
}

describe('RecipeCreatePage', () => {
  beforeEach(() => {
    vi.mocked(createRecipe).mockReset()
  })
  it('shows only the edited field error while typing invalid quantity', () => {
    render(<RecipeCreatePage categories={categories} />)

    fireEvent.change(screen.getByLabelText('分量'), {
      target: { value: 'abc' },
    })

    expect(screen.getByText('分量は 0 より大きい数値です')).toBeInTheDocument()
    expect(screen.queryByText('材料名は必須です')).not.toBeInTheDocument()
    expect(screen.queryByText('単位は必須です')).not.toBeInTheDocument()
  })

  it('does not show step required error before the field is touched', () => {
    render(<RecipeCreatePage categories={categories} />)

    expect(screen.queryByText('手順本文は必須です')).not.toBeInTheDocument()
  })

  it('shows step required error after blur when left empty', () => {
    render(<RecipeCreatePage categories={categories} />)

    fireEvent.focus(getStepBodyInput(0))
    fireEvent.blur(getStepBodyInput(0))

    expect(screen.getByText('手順本文は必須です')).toBeInTheDocument()
  })

  it('shows material name required error after blur when left empty', () => {
    render(<RecipeCreatePage categories={categories} />)

    fireEvent.focus(screen.getByLabelText('材料名'))
    fireEvent.blur(screen.getByLabelText('材料名'))

    expect(screen.getByText('材料名は必須です')).toBeInTheDocument()
    expect(screen.queryByText('手順本文は必須です')).not.toBeInTheDocument()
  })

  it('blocks save when step body is empty in an otherwise valid form', () => {
    render(<RecipeCreatePage categories={categories} />)

    fillValidForm()
    fireEvent.change(getStepBodyInput(0), {
      target: { value: '' },
    })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))

    expect(screen.getByText('手順本文は必須です')).toBeInTheDocument()
    expect(createRecipe).not.toHaveBeenCalled()
  })

  it('blocks save when an added step row is left empty', () => {
    render(<RecipeCreatePage categories={categories} />)

    fillValidForm()
    fireEvent.click(screen.getAllByRole('button', { name: '行を追加' })[1]!)
    fireEvent.click(screen.getByRole('button', { name: '保存' }))

    expect(screen.getByText('手順本文は必須です')).toBeInTheDocument()
    expect(createRecipe).not.toHaveBeenCalled()
  })

  it('shows only description error while typing an overlong description', () => {
    render(<RecipeCreatePage categories={categories} />)

    fireEvent.change(screen.getByLabelText(/^説明/), {
      target: { value: 'あ'.repeat(2001) },
    })

    expect(screen.getByText('説明は2000文字以内です')).toBeInTheDocument()
    expect(screen.queryByText('手順本文は必須です')).not.toBeInTheDocument()
    expect(screen.queryByText('材料名は必須です')).not.toBeInTheDocument()
  })

  it('shows client validation errors before submit', () => {
    render(<RecipeCreatePage categories={categories} />)

    fireEvent.click(screen.getByRole('button', { name: '保存' }))

    expect(screen.getByText('タイトルは必須です')).toBeInTheDocument()
    expect(screen.getByText('材料名は必須です')).toBeInTheDocument()
    expect(screen.getByText('手順本文は必須です')).toBeInTheDocument()
    expect(createRecipe).not.toHaveBeenCalled()
  })

  it('clears field errors when the value is fixed', () => {
    render(<RecipeCreatePage categories={categories} />)

    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    expect(screen.getByText('タイトルは必須です')).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('例: 醤油ラーメン'), {
      target: { value: '醤油ラーメン' },
    })

    expect(screen.queryByText('タイトルは必須です')).not.toBeInTheDocument()
  })

  it('clears quantity errors when the value is fixed', () => {
    render(<RecipeCreatePage categories={categories} />)

    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    expect(screen.getByText('分量は 0 より大きい数値です')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('分量'), {
      target: { value: '120' },
    })

    expect(screen.queryByText('分量は 0 より大きい数値です')).not.toBeInTheDocument()
  })

  it('clears server quantity errors when the value is fixed', async () => {
    vi.mocked(createRecipe).mockRejectedValue(
      new ApiValidationError('入力内容に誤りがあります', {
        'ingredients[0].quantity': '分量は 0 より大きい数値です',
      }),
    )

    render(<RecipeCreatePage categories={categories} />)
    fillValidForm()
    fireEvent.click(screen.getByRole('button', { name: '保存' }))

    await waitFor(() => {
      expect(screen.getByText('分量は 0 より大きい数値です')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText('分量'), {
      target: { value: '200' },
    })

    expect(screen.queryByText('分量は 0 より大きい数値です')).not.toBeInTheDocument()
  })

  it('prevents double submit while saving', async () => {
    let resolveCreate: ((value: Awaited<ReturnType<typeof createRecipe>>) => void) | undefined

    vi.mocked(createRecipe).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCreate = resolve
        }),
    )

    render(<RecipeCreatePage categories={categories} />)
    fillValidForm()

    const saveButton = screen.getByRole('button', { name: '保存' })
    fireEvent.click(saveButton)
    fireEvent.click(saveButton)

    expect(createRecipe).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: '保存中…' })).toBeDisabled()

    resolveCreate?.({
      id: 10,
      title: '醤油ラーメン',
      description: '',
      category: { id: 1, name: '和食' },
      servings: 2,
      cook_time_minutes: 30,
      difficulty: 3,
      ingredients: [],
      steps: [],
      created_at: '2026-08-21T00:00:00Z',
      updated_at: '2026-08-21T00:00:00Z',
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '保存' })).not.toBeDisabled()
    })
  })

  it('renders Lucide icons for create actions', () => {
    render(<RecipeCreatePage categories={categories} />)

    expect(document.querySelector('.lucide-arrow-left')).not.toBeNull()
    expect(document.querySelector('.lucide-plus')).not.toBeNull()
    expect(document.querySelector('.lucide-save')).not.toBeNull()
    expect(document.querySelector('.lucide-trash-2')).not.toBeNull()
  })

  it('shows server validation errors', async () => {
    vi.mocked(createRecipe).mockRejectedValue(
      new ApiValidationError('入力内容に誤りがあります', {
        title: 'タイトルは100文字以内です',
      }),
    )

    render(<RecipeCreatePage categories={categories} />)
    fillValidForm()
    fireEvent.click(screen.getByRole('button', { name: '保存' }))

    await waitFor(() => {
      expect(screen.getByText('タイトルは100文字以内です')).toBeInTheDocument()
    })
  })
})
