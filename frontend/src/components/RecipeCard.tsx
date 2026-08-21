/**
 * 一覧カード（docs/08-ui-design.md §4 SC-01）。
 * カテゴリ・時間・人数は Lucide、難易度は DifficultyRating。
 */
import { Clock, Tag, Users } from 'lucide-react'

import { DifficultyRating } from '#/components/DifficultyRating'
import type { RecipeSummary } from '#/lib/api'

type RecipeCardProps = {
  recipe: RecipeSummary
}

export function RecipeCard({ recipe }: RecipeCardProps) {
  return (
    <article className="rounded-[var(--radius)] border border-transparent bg-surface p-5 shadow-[var(--shadow)] transition hover:-translate-y-0.5 hover:border-primary-light hover:shadow-[0_6px_20px_rgba(62,39,35,0.1)]">
      <h3 className="mb-2 text-[1.05rem] font-semibold">{recipe.title}</h3>
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
        <span className="inline-flex items-center gap-1 rounded-full bg-primary-light px-2 py-0.5 text-xs font-semibold text-primary">
          <Tag className="h-3.5 w-3.5" aria-hidden="true" />
          {recipe.category.name}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          {recipe.cook_time_minutes}分
        </span>
        <DifficultyRating value={recipe.difficulty} />
        <span className="inline-flex items-center gap-1">
          <Users className="h-3.5 w-3.5" aria-hidden="true" />
          {recipe.servings}人分
        </span>
      </div>
    </article>
  )
}
