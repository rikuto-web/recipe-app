import { describe, expect, it, vi } from 'vitest'

import {
  isExistingIngredientDirty,
  isExistingStepDirty,
  persistRecipeEditRows,
  type EditPersistState,
} from '#/lib/recipeEditPersistence'
import type { RecipeFormValues } from '#/lib/recipeFormValidation'

function baseState(): EditPersistState {
  const baseline: RecipeFormValues = {
    title: '醤油ラーメン',
    description: '説明',
    category_id: '1',
    servings: '2',
    cook_time_minutes: '30',
    difficulty: 3,
    ingredients: [
      { key: 'i1', id: 10, name: '中華麺', quantity: '120', unit: 'g' },
      { key: 'i2', id: 11, name: '豚バラ', quantity: '80', unit: 'g' },
    ],
    steps: [
      { key: 's1', id: 20, body: 'スープを作る' },
      { key: 's2', id: 21, body: '麺を茹でる' },
    ],
  }

  return {
    values: structuredClone(baseline),
    baseline: structuredClone(baseline),
    deletedIngredientIds: [],
    deletedStepIds: [],
  }
}

describe('isExistingIngredientDirty', () => {
  it('detects reordering by index', () => {
    const state = baseState()
    const reordered = state.values.ingredients[1]!
    state.values.ingredients = [reordered, state.values.ingredients[0]!]

    expect(
      isExistingIngredientDirty(reordered, state.baseline, 0),
    ).toBe(true)
  })

  it('returns false when only unchanged rows remain at same index', () => {
    const state = baseState()
    const row = state.values.ingredients[0]!

    expect(isExistingIngredientDirty(row, state.baseline, 0)).toBe(false)
  })
})

describe('isExistingStepDirty', () => {
  it('detects reordering by index', () => {
    const state = baseState()
    const reordered = state.values.steps[1]!
    state.values.steps = [reordered, state.values.steps[0]!]

    expect(isExistingStepDirty(reordered, state.baseline, 0)).toBe(true)
  })
})

describe('persistRecipeEditRows', () => {
  it('does not duplicate POST when retrying after partial success', async () => {
    const initial = baseState()
    initial.values.ingredients.push({
      key: 'i3',
      name: 'ネギ',
      quantity: '10',
      unit: 'g',
    })
    initial.values.steps.push({
      key: 's3',
      body: '盛り付ける',
    })

    const createIngredient = vi.fn().mockResolvedValue({
      id: 12,
      sort_order: 3,
      name: 'ネギ',
      quantity: 10,
      unit: 'g',
    })
    const createStep = vi
      .fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({
        id: 22,
        step_number: 3,
        body: '盛り付ける',
      })

    const noopHandlers = {
      createIngredient,
      updateIngredient: vi.fn(),
      deleteIngredient: vi.fn(),
      createStep,
      updateStep: vi.fn(),
      deleteStep: vi.fn(),
    }

    await expect(
      persistRecipeEditRows(1, initial, () => {}, noopHandlers),
    ).rejects.toThrow('network')

    expect(createIngredient).toHaveBeenCalledTimes(1)

    const afterFailure: EditPersistState = {
      ...initial,
      values: {
        ...initial.values,
        ingredients: [
          ...initial.values.ingredients.slice(0, 2),
          {
            key: 'i3',
            id: 12,
            name: 'ネギ',
            quantity: '10',
            unit: 'g',
          },
        ],
      },
      baseline: {
        ...initial.baseline,
        ingredients: [
          ...initial.baseline.ingredients,
          {
            key: 'i3',
            id: 12,
            name: 'ネギ',
            quantity: '10',
            unit: 'g',
          },
        ],
      },
    }

    await persistRecipeEditRows(1, afterFailure, () => {}, noopHandlers)

    expect(createIngredient).toHaveBeenCalledTimes(1)
    expect(createStep).toHaveBeenCalledTimes(2)
  })

  it('deletes rows before creating new ones', async () => {
    const initial = baseState()
    initial.deletedIngredientIds = [11]
    initial.values.ingredients = [initial.values.ingredients[0]!]
    initial.values.ingredients.push({
      key: 'i3',
      name: 'ネギ',
      quantity: '10',
      unit: 'g',
    })

    const order: string[] = []
    const deleteIngredient = vi.fn().mockImplementation(async () => {
      order.push('delete')
    })
    const createIngredient = vi.fn().mockImplementation(async () => {
      order.push('create')
      return {
        id: 12,
        sort_order: 2,
        name: 'ネギ',
        quantity: 10,
        unit: 'g',
      }
    })

    await persistRecipeEditRows(
      1,
      initial,
      () => {},
      {
        createIngredient,
        updateIngredient: vi.fn(),
        deleteIngredient,
        createStep: vi.fn(),
        updateStep: vi.fn(),
        deleteStep: vi.fn(),
      },
    )

    expect(order).toEqual(['delete', 'create'])
  })
})
