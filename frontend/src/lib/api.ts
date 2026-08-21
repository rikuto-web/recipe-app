/**
 * レシピ API クライアント（docs/06-api.md §4–5）。
 */

import {
  toRecipeQueryString,
  type RecipeSearch,
} from '#/lib/recipeSearch'

export const API_BASE =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'

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

export type RecipeListData = {
  recipes: RecipeSummary[]
  total: number
  categories: Category[]
}

type CategoriesResponse = {
  categories: Category[]
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
