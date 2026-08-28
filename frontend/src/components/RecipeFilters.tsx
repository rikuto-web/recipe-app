/**
 * 一覧フィルタバー（docs/08-ui-design.md §4 SC-01）。
 * 検索アイコンは Lucide `Search` / `SlidersHorizontal`。★テキストは使わない。
 */
import { Search, SlidersHorizontal } from 'lucide-react'

import { DifficultyFilter } from '#/components/DifficultyFilter'
import { MaxCookTimeFilter } from '#/components/MaxCookTimeFilter'
import { Button } from '#/components/ui/button'
import type { Category } from '#/lib/api'
import {
  parseRecipeSearch,
  type RecipeSearch,
} from '#/lib/recipeSearch'

const controlClassName =
  'w-full rounded-lg border border-border bg-bg px-2.5 py-2 text-sm text-text outline-none focus:border-primary'

type RecipeFiltersProps = {
  categories: Category[]
  filters: RecipeSearch
  onSubmit: (filters: RecipeSearch) => void
}

export function RecipeFilters({
  categories,
  filters,
  onSubmit,
}: RecipeFiltersProps) {
  return (
    <form
      className="mb-5 rounded-[var(--radius)] bg-surface p-4 shadow-[var(--shadow)]"
      onSubmit={(event) => {
        event.preventDefault()
        const form = new FormData(event.currentTarget)
        onSubmit(
          parseRecipeSearch({
            q: form.get('q'),
            category_id: form.get('category_id'),
            difficulty: form.get('difficulty'),
            max_cook_time: form.get('max_cook_time'),
            sort: form.get('sort'),
          }),
        )
      }}
    >
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted">
        <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
        検索・フィルタ
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-[160px] flex-[2] flex-col gap-1">
          <span className="text-xs font-semibold text-muted">キーワード</span>
          <span className="relative">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
              aria-hidden="true"
            />
            <input
              type="search"
              name="q"
              defaultValue={filters.q ?? ''}
              placeholder="タイトルで検索…"
              aria-label="キーワード"
              className={`${controlClassName} pl-8`}
            />
          </span>
        </label>
        <label className="flex min-w-[120px] flex-1 flex-col gap-1">
          <span className="text-xs font-semibold text-muted">カテゴリ</span>
          <select
            name="category_id"
            defaultValue={filters.category_id ?? ''}
            aria-label="カテゴリ"
            className={controlClassName}
          >
            <option value="">すべて</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex min-w-[148px] flex-1 flex-col gap-1">
          <span className="text-xs font-semibold text-muted">難易度</span>
          <DifficultyFilter defaultValue={filters.difficulty} />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="flex min-w-[120px] flex-1 flex-col gap-1">
          <span className="text-xs font-semibold text-muted">
            調理時間上限（分）
          </span>
          <MaxCookTimeFilter defaultValue={filters.max_cook_time} />
        </label>
        <label className="flex min-w-[120px] flex-1 flex-col gap-1">
          <span className="text-xs font-semibold text-muted">並び順</span>
          <select
            name="sort"
            defaultValue={filters.sort ?? 'newest'}
            aria-label="並び順"
            className={controlClassName}
          >
            <option value="newest">新しい順</option>
            <option value="cook_time_asc">調理時間が短い順</option>
          </select>
        </label>
        <Button type="submit">
          <Search className="h-4 w-4" aria-hidden="true" />
          検索
        </Button>
      </div>
    </form>
  )
}
