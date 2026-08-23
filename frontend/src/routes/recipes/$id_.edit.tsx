/**
 * SC-04 レシピ編集。存在しない ID は 404 として一覧へ誘導する。
 * `$id_.edit` は詳細ルートの子にせず、`/recipes/$id/edit` を独立して描画する。
 */
import { createFileRoute, notFound } from '@tanstack/react-router'

import { EmptyState } from '#/components/EmptyState'
import { RecipeEditPage } from '#/components/RecipeEditPage'
import { RecipeNotFound } from '#/components/RecipeDetailPage'
import { ApiError, loadRecipeEditData } from '#/lib/api'

export const Route = createFileRoute('/recipes/$id_/edit')({
  loader: async ({ params }) => {
    if (!/^\d+$/.test(params.id)) {
      throw notFound()
    }

    try {
      return await loadRecipeEditData(params.id)
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        throw notFound()
      }
      throw error
    }
  },
  component: RecipeEditRoute,
  notFoundComponent: RecipeNotFound,
  errorComponent: EditError,
})

function RecipeEditRoute() {
  const { recipe, categories } = Route.useLoaderData()
  return (
    <RecipeEditPage
      key={recipe.id}
      recipe={recipe}
      categories={categories}
    />
  )
}

function EditError() {
  return (
    <EmptyState
      title="編集画面を開けませんでした"
      description="時間をおいて再度お試しください。"
    />
  )
}
