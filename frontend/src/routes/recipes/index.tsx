/**
 * SC-01 レシピ一覧。フィルタ条件は URL search params と同期する。
 */
import { createFileRoute } from '@tanstack/react-router'

import { EmptyState } from '#/components/EmptyState'
import { RecipeListPage } from '#/components/RecipeListPage'
import { loadRecipeList } from '#/lib/api'
import { parseRecipeSearch } from '#/lib/recipeSearch'

export const Route = createFileRoute('/recipes/')({
  validateSearch: parseRecipeSearch,
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => loadRecipeList(deps),
  component: RecipesRoute,
  errorComponent: ListError,
})

function RecipesRoute() {
  const data = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  return (
    <RecipeListPage
      recipes={data.recipes}
      total={data.total}
      categories={data.categories}
      filters={search}
      onSubmit={(next) => {
        void navigate({ search: () => next })
      }}
    />
  )
}

function ListError() {
  return (
    <EmptyState
      title="一覧を取得できませんでした"
      description="時間をおいて再度お試しください。"
    />
  )
}
