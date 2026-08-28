/**
 * レシピ API クライアント（docs/06-api.md §4–10）。
 */

import {
  toRecipeQueryString,
  type RecipeSearch,
} from '#/lib/recipeSearch'
import type {
  CreateRecipePayload,
  UpdateRecipePayload,
} from '#/lib/recipeFormValidation'

function getApiBase(): string {
  const configured = import.meta.env.VITE_API_BASE_URL
  if (configured !== undefined && configured !== '') {
    return configured
  }
  // SSR (Node) では相対 URL が使えないため、nginx 経由の同一オリジンを使う。
  if (typeof window === 'undefined') {
    return process.env.SSR_API_BASE ?? 'http://127.0.0.1'
  }
  return ''
}

const API_FETCH_TIMEOUT_MS = 8_000

function createFetchSignal(init?: RequestInit): AbortSignal | undefined {
  if (init?.signal) return init.signal
  if (typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal) {
    return AbortSignal.timeout(API_FETCH_TIMEOUT_MS)
  }
  return undefined
}

function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const signal = createFetchSignal(init)
  return fetch(input, {
    ...init,
    ...(signal ? { signal } : {}),
  })
}

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export class ApiValidationError extends Error {
  readonly status = 400
  readonly fieldErrors: Record<string, string>

  constructor(message: string, fieldErrors: Record<string, string>) {
    super(message)
    this.name = 'ApiValidationError'
    this.fieldErrors = fieldErrors
  }
}

export type Category = {
  id: number
  name: string
}

export type RecipeSummary = {
  id: number
  title: string
  category: Category
  servings: number
  cook_time_minutes: number
  difficulty: number
  created_at: string
  updated_at: string
}

export type Ingredient = {
  id: number
  sort_order: number
  name: string
  quantity: number
  unit: string
}

export type RecipeStep = {
  id: number
  step_number: number
  body: string
}

export type RecipeDetail = {
  id: number
  title: string
  description: string
  category: Category
  servings: number
  cook_time_minutes: number
  difficulty: number
  ingredients: Ingredient[]
  steps: RecipeStep[]
  created_at: string
  updated_at: string
}

export type RecipeListData = {
  recipes: RecipeSummary[]
  total: number
  categories: Category[]
}

type CategoriesResponse = {
  categories: Category[]
}

type ApiErrorResponse = {
  error: {
    code: string
    message: string
    details?: Array<{ field: string; message: string }>
  }
}

type RecipesResponse = {
  recipes: RecipeSummary[]
  total: number
}

export async function loadRecipeList(
  search: RecipeSearch,
): Promise<RecipeListData> {
  const query = toRecipeQueryString(search)
  const recipesUrl = query
    ? `${getApiBase()}/api/recipes?${query}`
    : `${getApiBase()}/api/recipes`

  const [recipesRes, categoriesRes] = await Promise.all([
    apiFetch(recipesUrl),
    apiFetch(`${getApiBase()}/api/categories`),
  ])

  if (!recipesRes.ok) {
    await readApiError(recipesRes)
  }

  if (!categoriesRes.ok) {
    await readApiError(categoriesRes)
  }

  const recipesJson = (await recipesRes.json()) as RecipesResponse
  const categoriesJson = (await categoriesRes.json()) as CategoriesResponse

  return {
    recipes: recipesJson.recipes,
    total: recipesJson.total,
    categories: categoriesJson.categories,
  }
}

export async function loadRecipe(id: string | number): Promise<RecipeDetail> {
  const response = await apiFetch(`${getApiBase()}/api/recipes/${id}`)

  if (response.status === 404) {
    throw new ApiError(404, 'レシピが見つかりません')
  }

  if (!response.ok) {
    await readApiError(response)
  }

  return (await response.json()) as RecipeDetail
}

export async function loadCategories(): Promise<Category[]> {
  const response = await apiFetch(`${getApiBase()}/api/categories`)

  if (!response.ok) {
    await readApiError(response)
  }

  const json = (await response.json()) as CategoriesResponse
  return json.categories
}

export type IngredientWritePayload = {
  name: string
  quantity: number
  unit: string
  sort_order?: number
}

export type IngredientPatchPayload = {
  name?: string
  quantity?: number
  unit?: string
  sort_order?: number
}

export type StepWritePayload = {
  body: string
  step_number?: number
}

export type StepPatchPayload = {
  body?: string
  step_number?: number
}

async function readApiError(response: Response): Promise<never> {
  if (response.status === 400) {
    const json = (await response.json()) as ApiErrorResponse
    const fieldErrors = Object.fromEntries(
      (json.error.details ?? []).map((detail) => [detail.field, detail.message]),
    )
    throw new ApiValidationError(json.error.message, fieldErrors)
  }

  if (response.status === 404) {
    throw new ApiError(404, '対象が見つかりません')
  }

  throw new Error(`リクエストに失敗しました（HTTP ${response.status}）`)
}

export async function createRecipe(
  payload: CreateRecipePayload,
): Promise<RecipeDetail> {
  const response = await apiFetch(`${getApiBase()}/api/recipes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    await readApiError(response)
  }

  return (await response.json()) as RecipeDetail
}

export async function updateRecipe(
  id: number,
  payload: UpdateRecipePayload,
): Promise<RecipeDetail> {
  const response = await apiFetch(`${getApiBase()}/api/recipes/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    await readApiError(response)
  }

  return (await response.json()) as RecipeDetail
}

export async function createIngredient(
  recipeId: number,
  payload: IngredientWritePayload,
): Promise<Ingredient> {
  const response = await apiFetch(
    `${getApiBase()}/api/recipes/${recipeId}/ingredients`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  )

  if (!response.ok) {
    await readApiError(response)
  }

  return (await response.json()) as Ingredient
}

export async function updateIngredient(
  recipeId: number,
  ingredientId: number,
  payload: IngredientPatchPayload,
): Promise<Ingredient> {
  const response = await apiFetch(
    `${getApiBase()}/api/recipes/${recipeId}/ingredients/${ingredientId}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  )

  if (!response.ok) {
    await readApiError(response)
  }

  return (await response.json()) as Ingredient
}

export async function deleteIngredient(
  recipeId: number,
  ingredientId: number,
): Promise<void> {
  const response = await apiFetch(
    `${getApiBase()}/api/recipes/${recipeId}/ingredients/${ingredientId}`,
    { method: 'DELETE' },
  )

  if (!response.ok) {
    await readApiError(response)
  }
}

export async function createStep(
  recipeId: number,
  payload: StepWritePayload,
): Promise<RecipeStep> {
  const response = await apiFetch(`${getApiBase()}/api/recipes/${recipeId}/steps`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    await readApiError(response)
  }

  return (await response.json()) as RecipeStep
}

export async function updateStep(
  recipeId: number,
  stepId: number,
  payload: StepPatchPayload,
): Promise<RecipeStep> {
  const response = await apiFetch(
    `${getApiBase()}/api/recipes/${recipeId}/steps/${stepId}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  )

  if (!response.ok) {
    await readApiError(response)
  }

  return (await response.json()) as RecipeStep
}

export async function deleteStep(
  recipeId: number,
  stepId: number,
): Promise<void> {
  const response = await apiFetch(
    `${getApiBase()}/api/recipes/${recipeId}/steps/${stepId}`,
    { method: 'DELETE' },
  )

  if (!response.ok) {
    await readApiError(response)
  }
}

export async function deleteRecipe(recipeId: number): Promise<void> {
  const response = await apiFetch(`${getApiBase()}/api/recipes/${recipeId}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    await readApiError(response)
  }
}

export async function loadRecipeEditData(id: string | number): Promise<{
  recipe: RecipeDetail
  categories: Category[]
}> {
  const [recipe, categories] = await Promise.all([
    loadRecipe(id),
    loadCategories(),
  ])
  return { recipe, categories }
}
