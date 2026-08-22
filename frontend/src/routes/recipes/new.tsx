/**
 * SC-03 レシピ新規作成。カテゴリ一覧を loader で取得する。
 */
import { createFileRoute } from '@tanstack/react-router'

import { EmptyState } from '#/components/EmptyState'
import { RecipeCreatePage } from '#/components/RecipeCreatePage'
import { loadCategories } from '#/lib/api'

export const Route = createFileRoute('/recipes/new')({
  loader: () => loadCategories(),
  component: RecipeCreateRoute,
  errorComponent: CreateError,
})

function RecipeCreateRoute() {
  const categories = Route.useLoaderData()
  return <RecipeCreatePage categories={categories} />
}

function CreateError() {
  return (
    <EmptyState
      title="作成画面を開けませんでした"
      description="時間をおいて再度お試しください。"
    />
  )
}
