import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

import { DeleteRecipeButton } from '#/components/DeleteRecipeButton'
import { ApiError, deleteRecipe } from '#/lib/api'

vi.mock('#/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('#/lib/api')>()
  return {
    ...actual,
    deleteRecipe: vi.fn(),
  }
})

describe('DeleteRecipeButton', () => {
  const onDeleted = vi.fn()

  beforeEach(() => {
    vi.mocked(deleteRecipe).mockReset()
    onDeleted.mockReset()
  })

  it('opens a confirmation dialog and does not delete until confirmed', async () => {
    vi.mocked(deleteRecipe).mockResolvedValue()

    render(
      <DeleteRecipeButton
        recipeId={1}
        recipeTitle="醤油ラーメン"
        onDeleted={onDeleted}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '醤油ラーメン を削除' }))

    expect(
      screen.getByRole('heading', { name: 'レシピを削除しますか？' }),
    ).toBeInTheDocument()
    expect(screen.getByText('削除対象')).toBeInTheDocument()
    expect(screen.getByText('醤油ラーメン')).toBeInTheDocument()
    expect(
      screen.getByText(/材料・手順も含めて完全に削除されます。/),
    ).toBeInTheDocument()
    expect(screen.getByText(/この操作は取り消せません。/)).toBeInTheDocument()
    expect(deleteRecipe).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }))
    expect(deleteRecipe).not.toHaveBeenCalled()
    expect(onDeleted).not.toHaveBeenCalled()
  })

  it('deletes the recipe and calls onDeleted when confirmed', async () => {
    vi.mocked(deleteRecipe).mockResolvedValue()

    render(
      <DeleteRecipeButton
        recipeId={1}
        recipeTitle="醤油ラーメン"
        onDeleted={onDeleted}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '醤油ラーメン を削除' }))
    fireEvent.click(screen.getByRole('button', { name: '削除する' }))

    await waitFor(() => {
      expect(deleteRecipe).toHaveBeenCalledWith(1)
      expect(onDeleted).toHaveBeenCalledTimes(1)
    })
  })

  it('treats 404 as already deleted and still calls onDeleted', async () => {
    vi.mocked(deleteRecipe).mockRejectedValue(new ApiError(404, 'not found'))

    render(
      <DeleteRecipeButton
        recipeId={1}
        recipeTitle="醤油ラーメン"
        onDeleted={onDeleted}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '醤油ラーメン を削除' }))
    fireEvent.click(screen.getByRole('button', { name: '削除する' }))

    await waitFor(() => {
      expect(onDeleted).toHaveBeenCalledTimes(1)
    })
  })
})
