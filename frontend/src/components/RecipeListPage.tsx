/**
 * SC-01 レシピ一覧の表示（API 結果 + フィルタ）。
 * ルートは search params 同期と loader だけを担当する。
 */
import { EmptyState } from '#/components/EmptyState'
import { RecipeCard } from '#/components/RecipeCard'
import { RecipeFilters } from '#/components/RecipeFilters'
import type { Category, RecipeSummary } from '#/lib/api'
import {
  hasActiveFilters,
  type RecipeSearch,
} from '#/lib/recipeSearch'

type RecipeListPageProps = {
  recipes: RecipeSummary[]
  total: number
  categories: Category[]
  filters: RecipeSearch
  onSubmit: (filters: RecipeSearch) => void
}

export function RecipeListPage({
  recipes,
  total,
  categories,
  filters,
  onSubmit,
}: RecipeListPageProps) {
  const emptyTitle = hasActiveFilters(filters)
    ? '条件に一致するレシピがありません'
    : 'レシピがまだありません'
  const emptyDescription = hasActiveFilters(filters)
    ? '条件を変えて検索してください'
    : '新規作成ボタンから最初のレシピを追加できます。'

  return (
    <div>
      <RecipeFilters
        key={JSON.stringify(filters)}
        categories={categories}
        filters={filters}
        onSubmit={onSubmit}
      />
      <p className="mb-4 text-sm text-muted">該当 {total} 件</p>
      {recipes.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
          {recipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      )}
    </div>
  )
}
