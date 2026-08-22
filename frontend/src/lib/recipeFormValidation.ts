/**
 * レシピ作成フォームのクライアント側バリデーション（docs/01-functional-requirements.md §4）。
 */

export type IngredientFormRow = {
  key: string
  name: string
  quantity: string
  unit: string
}

export type StepFormRow = {
  key: string
  body: string
}

export type RecipeFormValues = {
  title: string
  description: string
  category_id: string
  servings: string
  cook_time_minutes: string
  difficulty: number
  ingredients: IngredientFormRow[]
  steps: StepFormRow[]
}

export type RecipeFormErrors = Record<string, string>

export const UNIT_SUGGESTIONS = [
  'g',
  'kg',
  'ml',
  'L',
  '個',
  '本',
  '枚',
  '小さじ',
  '大さじ',
  'カップ',
  '適量',
] as const

export const COOK_TIME_STEP_MINUTES = 10
export const MIN_COOK_TIME_MINUTES = COOK_TIME_STEP_MINUTES

/** 全角数字・小数点を半角に揃える（入力時・バリデーション時に使う） */
export function normalizeNumericInput(value: string): string {
  return value
    .replace(/[０-９]/g, (char) =>
      String.fromCharCode(char.charCodeAt(0) - 0xfee0),
    )
    .replace(/．/g, '.')
}

export function createEmptyIngredientRow(key = crypto.randomUUID()): IngredientFormRow {
  return { key, name: '', quantity: '', unit: '' }
}

export function createEmptyStepRow(key = crypto.randomUUID()): StepFormRow {
  return { key, body: '' }
}

export function createInitialFormValues(
  defaultCategoryId?: number,
): RecipeFormValues {
  return {
    title: '',
    description: '',
    category_id: defaultCategoryId ? String(defaultCategoryId) : '',
    servings: '2',
    cook_time_minutes: '30',
    difficulty: 3,
    ingredients: [createEmptyIngredientRow()],
    steps: [createEmptyStepRow()],
  }
}

type ValidateFieldOptions = {
  /** 未入力をエラーにする（触れたフィールド・保存時） */
  required?: boolean
}

function collectFormFieldKeys(values: RecipeFormValues): string[] {
  const keys = [
    'title',
    'description',
    'category_id',
    'servings',
    'cook_time_minutes',
    'difficulty',
  ]

  if (values.ingredients.length === 0) {
    keys.push('ingredients')
  } else {
    values.ingredients.forEach((_, index) => {
      keys.push(
        `ingredients.${index}.name`,
        `ingredients.${index}.quantity`,
        `ingredients.${index}.unit`,
      )
    })
  }

  if (values.steps.length === 0) {
    keys.push('steps')
  } else {
    values.steps.forEach((_, index) => {
      keys.push(`steps.${index}.body`)
    })
  }

  return keys
}

/** 単一フィールドのバリデーション（未触れの必須項目は required: false で未入力を許容） */
export function validateRecipeFormField(
  values: RecipeFormValues,
  field: string,
  options: ValidateFieldOptions = {},
): string | undefined {
  const required = options.required ?? false

  if (field === 'title') {
    const title = values.title.trim()
    if (!title) {
      return required ? 'タイトルは必須です' : undefined
    }
    if (title.length > 100) {
      return 'タイトルは100文字以内です'
    }
    return undefined
  }

  if (field === 'description') {
    if (values.description.trim().length > 2000) {
      return '説明は2000文字以内です'
    }
    return undefined
  }

  if (field === 'category_id') {
    if (!values.category_id) {
      return required ? 'カテゴリは必須です' : undefined
    }
    return undefined
  }

  if (field === 'servings') {
    const trimmed = values.servings.trim()
    if (!trimmed) {
      return required ? '人数は 1 以上の整数です' : undefined
    }
    const servings = Number(normalizeNumericInput(trimmed))
    if (!Number.isInteger(servings) || servings < 1) {
      return '人数は 1 以上の整数です'
    }
    return undefined
  }

  if (field === 'cook_time_minutes') {
    const trimmed = values.cook_time_minutes.trim()
    if (!trimmed) {
      return required
        ? `調理時間は ${MIN_COOK_TIME_MINUTES} 分以上（10分単位）です`
        : undefined
    }
    const cookTime = Number(normalizeNumericInput(trimmed))
    if (
      !Number.isInteger(cookTime) ||
      cookTime < MIN_COOK_TIME_MINUTES ||
      cookTime % COOK_TIME_STEP_MINUTES !== 0
    ) {
      return `調理時間は ${MIN_COOK_TIME_MINUTES} 分以上（10分単位）です`
    }
    return undefined
  }

  if (field === 'difficulty') {
    if (
      !Number.isInteger(values.difficulty) ||
      values.difficulty < 1 ||
      values.difficulty > 5
    ) {
      return '難易度は 1 から 5 の整数です'
    }
    return undefined
  }

  if (field === 'ingredients') {
    if (values.ingredients.length === 0) {
      return '材料は 1 件以上必要です'
    }
    return undefined
  }

  const ingredientNameMatch = /^ingredients\.(\d+)\.name$/.exec(field)
  if (ingredientNameMatch) {
    const index = Number(ingredientNameMatch[1])
    const ingredient = values.ingredients[index]
    if (!ingredient) {
      return undefined
    }
    const name = ingredient.name.trim()
    if (!name) {
      return required ? '材料名は必須です' : undefined
    }
    if (name.length > 100) {
      return '材料名は100文字以内です'
    }
    return undefined
  }

  const ingredientQuantityMatch = /^ingredients\.(\d+)\.quantity$/.exec(field)
  if (ingredientQuantityMatch) {
    const index = Number(ingredientQuantityMatch[1])
    const ingredient = values.ingredients[index]
    if (!ingredient) {
      return undefined
    }
    const trimmed = ingredient.quantity.trim()
    if (!trimmed) {
      return required ? '分量は 0 より大きい数値です' : undefined
    }
    const quantity = Number(normalizeNumericInput(trimmed))
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return '分量は 0 より大きい数値です'
    }
    return undefined
  }

  const ingredientUnitMatch = /^ingredients\.(\d+)\.unit$/.exec(field)
  if (ingredientUnitMatch) {
    const index = Number(ingredientUnitMatch[1])
    const ingredient = values.ingredients[index]
    if (!ingredient) {
      return undefined
    }
    const unit = ingredient.unit.trim()
    if (!unit) {
      return required ? '単位は必須です' : undefined
    }
    if (unit.length > 20) {
      return '単位は20文字以内です'
    }
    return undefined
  }

  if (field === 'steps') {
    if (values.steps.length === 0) {
      return '手順は 1 件以上必要です'
    }
    return undefined
  }

  const stepBodyMatch = /^steps\.(\d+)\.body$/.exec(field)
  if (stepBodyMatch) {
    const index = Number(stepBodyMatch[1])
    const step = values.steps[index]
    if (!step) {
      return undefined
    }
    const body = step.body.trim()
    if (!body) {
      return required ? '手順本文は必須です' : undefined
    }
    if (body.length > 2000) {
      return '手順本文は2000文字以内です'
    }
    return undefined
  }

  return undefined
}

export function validateRecipeForm(values: RecipeFormValues): RecipeFormErrors {
  const errors: RecipeFormErrors = {}

  for (const field of collectFormFieldKeys(values)) {
    const message = validateRecipeFormField(values, field, { required: true })
    if (message) {
      errors[field] = message
    }
  }

  return errors
}

/** API の `ingredients[0].quantity` 形式を UI の `ingredients.0.quantity` に揃える */
export function normalizeFieldErrors(
  fieldErrors: Record<string, string>,
): RecipeFormErrors {
  return Object.fromEntries(
    Object.entries(fieldErrors).map(([field, message]) => [
      field.replace(/\[(\d+)\]/g, '.$1'),
      message,
    ]),
  )
}

export type CreateRecipePayload = {
  title: string
  description: string
  category_id: number
  servings: number
  cook_time_minutes: number
  difficulty: number
  ingredients: Array<{
    sort_order: number
    name: string
    quantity: number
    unit: string
  }>
  steps: Array<{
    step_number: number
    body: string
  }>
}

export function toCreateRecipePayload(values: RecipeFormValues): CreateRecipePayload {
  return {
    title: values.title.trim(),
    description: values.description.trim(),
    category_id: Number(values.category_id),
    servings: Number(normalizeNumericInput(values.servings.trim())),
    cook_time_minutes: Number(normalizeNumericInput(values.cook_time_minutes.trim())),
    difficulty: values.difficulty,
    ingredients: values.ingredients.map((ingredient, index) => ({
      sort_order: index + 1,
      name: ingredient.name.trim(),
      quantity: Number(normalizeNumericInput(ingredient.quantity.trim())),
      unit: ingredient.unit.trim(),
    })),
    steps: values.steps.map((step, index) => ({
      step_number: index + 1,
      body: step.body.trim(),
    })),
  }
}

export function isRecipeFormDirty(
  values: RecipeFormValues,
  baseline: RecipeFormValues,
): boolean {
  return (
    values.title.trim() !== baseline.title.trim() ||
    values.description.trim() !== baseline.description.trim() ||
    values.category_id !== baseline.category_id ||
    values.servings !== baseline.servings ||
    values.cook_time_minutes !== baseline.cook_time_minutes ||
    values.difficulty !== baseline.difficulty ||
    values.ingredients.length !== baseline.ingredients.length ||
    values.steps.length !== baseline.steps.length ||
    values.ingredients.some((row, index) => {
      const base = baseline.ingredients[index]
      return (
        !base ||
        row.name.trim() !== base.name.trim() ||
        row.quantity.trim() !== base.quantity.trim() ||
        row.unit.trim() !== base.unit.trim()
      )
    }) ||
    values.steps.some((row, index) => {
      const base = baseline.steps[index]
      return !base || row.body.trim() !== base.body.trim()
    })
  )
}
