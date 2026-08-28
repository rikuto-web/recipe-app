/**
 * SC-04 編集画面のフッター保存: 変更検知と API 呼び出し順序。
 * API 自体は行単位（PUT / PATCH / POST / DELETE）のまま、UI から一括で送る。
 */

import {
  createIngredient,
  createStep,
  deleteIngredient,
  deleteStep,
  updateIngredient,
  updateStep,
  type Ingredient,
  type RecipeStep,
} from '#/lib/api'
import {
  normalizeNumericInput,
  type IngredientFormRow,
  type RecipeFormValues,
  type StepFormRow,
} from '#/lib/recipeFormValidation'

export type EditPersistState = {
  values: RecipeFormValues
  baseline: RecipeFormValues
  deletedIngredientIds: number[]
  deletedStepIds: number[]
}

type PersistHandlers = {
  createIngredient: typeof createIngredient
  updateIngredient: typeof updateIngredient
  deleteIngredient: typeof deleteIngredient
  createStep: typeof createStep
  updateStep: typeof updateStep
  deleteStep: typeof deleteStep
}

const defaultHandlers: PersistHandlers = {
  createIngredient,
  updateIngredient,
  deleteIngredient,
  createStep,
  updateStep,
  deleteStep,
}

export function ingredientPayload(row: IngredientFormRow, index: number) {
  return {
    name: row.name.trim(),
    quantity: Number(normalizeNumericInput(row.quantity.trim())),
    unit: row.unit.trim(),
    sort_order: index + 1,
  }
}

export function stepPatchPayload(
  row: StepFormRow,
  index: number,
  baseline: RecipeFormValues,
) {
  const payload: { body: string; step_number?: number } = {
    body: row.body.trim(),
  }
  const baseIndex = baseline.steps.findIndex((item) => item.id === row.id)
  if (baseIndex >= 0 && baseIndex !== index) {
    payload.step_number = index + 1
  }
  return payload
}

export function isExistingIngredientDirty(
  row: IngredientFormRow,
  baseline: RecipeFormValues,
  index: number,
) {
  if (row.id == null) {
    return false
  }
  const baseIndex = baseline.ingredients.findIndex((item) => item.id === row.id)
  if (baseIndex < 0) {
    return true
  }
  const base = baseline.ingredients[baseIndex]!
  return (
    row.name.trim() !== base.name.trim() ||
    row.quantity.trim() !== base.quantity.trim() ||
    row.unit.trim() !== base.unit.trim() ||
    baseIndex !== index
  )
}

export function isExistingStepDirty(
  row: StepFormRow,
  baseline: RecipeFormValues,
  index: number,
) {
  if (row.id == null) {
    return false
  }
  const baseIndex = baseline.steps.findIndex((item) => item.id === row.id)
  if (baseIndex < 0) {
    return true
  }
  const base = baseline.steps[baseIndex]!
  return base.body.trim() !== row.body.trim() || baseIndex !== index
}

function syncIngredientRow(
  row: IngredientFormRow,
  saved: Ingredient,
): IngredientFormRow {
  return {
    ...row,
    id: saved.id,
    name: saved.name,
    quantity: String(saved.quantity),
    unit: saved.unit,
  }
}

function syncStepRow(row: StepFormRow, saved: RecipeStep): StepFormRow {
  return {
    ...row,
    id: saved.id,
    body: saved.body,
  }
}

function replaceIngredientInBaseline(
  baseline: RecipeFormValues,
  row: IngredientFormRow,
  index: number,
): RecipeFormValues {
  const ingredients = [...baseline.ingredients]
  const existingIndex = ingredients.findIndex((item) => item.id === row.id)
  if (existingIndex >= 0) {
    ingredients[existingIndex] = { ...row }
  } else {
    ingredients.splice(index, 0, { ...row })
  }
  return { ...baseline, ingredients }
}

function replaceStepInBaseline(
  baseline: RecipeFormValues,
  row: StepFormRow,
  index: number,
): RecipeFormValues {
  const steps = [...baseline.steps]
  const existingIndex = steps.findIndex((item) => item.id === row.id)
  if (existingIndex >= 0) {
    steps[existingIndex] = { ...row }
  } else {
    steps.splice(index, 0, { ...row })
  }
  return { ...baseline, steps }
}

function removeIngredientFromBaseline(
  baseline: RecipeFormValues,
  ingredientId: number,
): RecipeFormValues {
  return {
    ...baseline,
    ingredients: baseline.ingredients.filter((item) => item.id !== ingredientId),
  }
}

function removeStepFromBaseline(
  baseline: RecipeFormValues,
  stepId: number,
): RecipeFormValues {
  return {
    ...baseline,
    steps: baseline.steps.filter((item) => item.id !== stepId),
  }
}

/** 子行の DELETE → PATCH/POST → 途中成功分は state に反映（再保存時の二重 POST 防止）。 */
export async function persistRecipeEditRows(
  recipeId: number,
  initial: EditPersistState,
  onProgress: (state: EditPersistState) => void,
  handlers: PersistHandlers = defaultHandlers,
): Promise<EditPersistState> {
  let state = initial

  for (const ingredientId of [...state.deletedIngredientIds]) {
    await handlers.deleteIngredient(recipeId, ingredientId)
    state = {
      ...state,
      deletedIngredientIds: state.deletedIngredientIds.filter(
        (id) => id !== ingredientId,
      ),
      baseline: removeIngredientFromBaseline(state.baseline, ingredientId),
    }
    onProgress(state)
  }

  for (const stepId of [...state.deletedStepIds]) {
    await handlers.deleteStep(recipeId, stepId)
    state = {
      ...state,
      deletedStepIds: state.deletedStepIds.filter((id) => id !== stepId),
      baseline: removeStepFromBaseline(state.baseline, stepId),
    }
    onProgress(state)
  }

  const nextIngredients = [...state.values.ingredients]
  for (const [index, row] of state.values.ingredients.entries()) {
    if (row.id == null) {
      const saved = await handlers.createIngredient(
        recipeId,
        ingredientPayload(row, index),
      )
      nextIngredients[index] = syncIngredientRow(row, saved)
      const syncedRow = nextIngredients[index]!
      state = {
        ...state,
        values: { ...state.values, ingredients: [...nextIngredients] },
        baseline: replaceIngredientInBaseline(state.baseline, syncedRow, index),
      }
      onProgress(state)
      continue
    }

    if (!isExistingIngredientDirty(row, state.baseline, index)) {
      continue
    }

    const saved = await handlers.updateIngredient(
      recipeId,
      row.id,
      ingredientPayload(row, index),
    )
    nextIngredients[index] = syncIngredientRow(row, saved)
    const syncedRow = nextIngredients[index]!
    state = {
      ...state,
      values: { ...state.values, ingredients: [...nextIngredients] },
      baseline: replaceIngredientInBaseline(state.baseline, syncedRow, index),
    }
    onProgress(state)
  }

  const nextSteps = [...state.values.steps]
  for (const [index, row] of state.values.steps.entries()) {
    if (row.id == null) {
      const saved = await handlers.createStep(recipeId, {
        body: row.body.trim(),
      })
      nextSteps[index] = syncStepRow(row, saved)
      const syncedRow = nextSteps[index]!
      state = {
        ...state,
        values: { ...state.values, steps: [...nextSteps] },
        baseline: replaceStepInBaseline(state.baseline, syncedRow, index),
      }
      onProgress(state)
      continue
    }

    if (!isExistingStepDirty(row, state.baseline, index)) {
      continue
    }

    const saved = await handlers.updateStep(
      recipeId,
      row.id,
      stepPatchPayload(row, index, state.baseline),
    )
    nextSteps[index] = syncStepRow(row, saved)
    const syncedRow = nextSteps[index]!
    state = {
      ...state,
      values: { ...state.values, steps: [...nextSteps] },
      baseline: replaceStepInBaseline(state.baseline, syncedRow, index),
    }
    onProgress(state)
  }

  return state
}
