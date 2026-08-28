/**
 * SC-02 レシピ詳細。存在しない ID は 404 として一覧へ誘導する。
 */
import { createFileRoute, notFound } from '@tanstack/react-router'

import { EmptyState } from '#/components/EmptyState'
import { RecipeDetailPage, RecipeNotFound } from '#/components/RecipeDetailPage'
import { ApiError, loadRecipe } from '#/lib/api'

export const Route = createFileRoute('/recipes/$id')({
  loader: async ({ params }) => {
    if (!/^\d+$/.test(params.id)) {
      throw notFound()
    }

    try {
      return await loadRecipe(params.id)
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        throw notFound()
      }
      throw error
    }
  },
  component: RecipeDetailRoute,
  notFoundComponent: RecipeNotFound,
  errorComponent: DetailError,
})

function RecipeDetailRoute() {
  const recipe = Route.useLoaderData()
  return <RecipeDetailPage key={recipe.id} recipe={recipe} />
}

function DetailError() {
  return (
    <EmptyState
      title="レシピを取得できませんでした"
      description="時間をおいて再度お試しください。"
    />
  )
}
