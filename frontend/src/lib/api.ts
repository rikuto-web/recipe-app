/**
 * レシピ API クライアント（docs/06-api.md §4–6）。
 */

import {
  toRecipeQueryString,
  type RecipeSearch,
} from '#/lib/recipeSearch'
import type { CreateRecipePayload } from '#/lib/recipeFormValidation'

export const API_BASE =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'

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
    ? `${API_BASE}/api/recipes?${query}`
    : `${API_BASE}/api/recipes`

  const [recipesRes, categoriesRes] = await Promise.all([
    fetch(recipesUrl),
    fetch(`${API_BASE}/api/categories`),
  ])

  if (!recipesRes.ok || !categoriesRes.ok) {
    throw new Error('レシピ一覧の取得に失敗しました')
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
  const response = await fetch(`${API_BASE}/api/recipes/${id}`)

  if (response.status === 404) {
    throw new ApiError(404, 'レシピが見つかりません')
  }

  if (!response.ok) {
    throw new Error('レシピ詳細の取得に失敗しました')
  }

  return (await response.json()) as RecipeDetail
}

export async function loadCategories(): Promise<Category[]> {
  const response = await fetch(`${API_BASE}/api/categories`)

  if (!response.ok) {
    throw new Error('カテゴリ一覧の取得に失敗しました')
  }

  const json = (await response.json()) as CategoriesResponse
  return json.categories
}

export async function createRecipe(
  payload: CreateRecipePayload,
): Promise<RecipeDetail> {
  const response = await fetch(`${API_BASE}/api/recipes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (response.status === 400) {
    const json = (await response.json()) as ApiErrorResponse
    const fieldErrors = Object.fromEntries(
      (json.error.details ?? []).map((detail) => [detail.field, detail.message]),
    )
    throw new ApiValidationError(json.error.message, fieldErrors)
  }

  if (response.status === 405) {
    throw new Error(
      '作成 API が利用できません。バックエンドを再起動してください（cargo run）。',
    )
  }

  if (!response.ok) {
    throw new Error(`レシピの作成に失敗しました（HTTP ${response.status}）`)
  }

  return (await response.json()) as RecipeDetail
}
