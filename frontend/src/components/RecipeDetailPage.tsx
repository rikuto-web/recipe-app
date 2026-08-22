/**
 * SC-02 レシピ詳細（docs/04-screen-transitions.md, docs/08-ui-design.md §4）。
 * 人数按分はクライアントのみ。編集は VS-04 で接続する。
 */
import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  ArrowLeft,
  Carrot,
  Clock,
  ListOrdered,
  Minus,
  Pencil,
  Plus,
  Tag,
  Users,
} from 'lucide-react'

import { DifficultyRating } from '#/components/DifficultyRating'
import { EmptyState } from '#/components/EmptyState'
import { Button } from '#/components/ui/button'
import type { RecipeDetail } from '#/lib/api'
import { formatQuantity, scaleQuantity } from '#/lib/scaleQuantity'

type RecipeDetailPageProps = {
  recipe: RecipeDetail
}

export function RecipeDetailPage({ recipe }: RecipeDetailPageProps) {
  const [displayServings, setDisplayServings] = useState(recipe.servings)

  return (
    <article>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Button variant="secondary" asChild>
          <Link to="/recipes">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            一覧
          </Link>
        </Button>
        {/* VS-04 で `/recipes/$id/edit` へ接続する */}
        <Button type="button" variant="outline" disabled aria-label="編集（準備中）">
          <Pencil className="h-4 w-4" aria-hidden="true" />
          編集
        </Button>
      </div>

      <h2 className="mb-3 text-2xl font-bold">{recipe.title}</h2>
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-muted">
        <span className="inline-flex items-center gap-1 rounded-full bg-primary-light px-2.5 py-0.5 text-xs font-semibold text-primary">
          <Tag className="h-3.5 w-3.5" aria-hidden="true" />
          {recipe.category.name}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock className="h-4 w-4" aria-hidden="true" />
          {recipe.cook_time_minutes}分
        </span>
        <DifficultyRating value={recipe.difficulty} />
        <span className="inline-flex items-center gap-1">
          <Users className="h-4 w-4" aria-hidden="true" />
          {recipe.servings}人分
        </span>
      </div>

      {recipe.description ? (
        <p className="mb-6 border-l-4 border-primary pl-4 text-text">
          {recipe.description}
        </p>
      ) : null}

      <section className="mb-8 rounded-[var(--radius)] bg-surface p-5 shadow-[var(--shadow)]">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <Carrot className="h-5 w-5 text-primary" aria-hidden="true" />
            材料
          </h3>
          <div className="flex items-center rounded-full bg-primary-light p-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 text-primary hover:bg-primary/10 hover:text-primary"
              disabled={displayServings <= 1}
              aria-label="1人減らす"
              onClick={() =>
                setDisplayServings((current) => Math.max(1, current - 1))
              }
            >
              <Minus className="h-4 w-4" aria-hidden="true" />
            </Button>
            <span
              className="inline-flex min-w-[3.25rem] items-center justify-center gap-1 text-sm font-semibold text-primary tabular-nums"
              aria-live="polite"
            >
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              {displayServings}人分
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 text-primary hover:bg-primary/10 hover:text-primary"
              aria-label="1人増やす"
              onClick={() => setDisplayServings((current) => current + 1)}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
        <ul className="divide-y divide-border">
          {recipe.ingredients.map((ingredient) => {
            const scaled = scaleQuantity(
              ingredient.quantity,
              recipe.servings,
              displayServings,
            )

            return (
              <li
                key={ingredient.id}
                className="flex items-baseline justify-between gap-4 py-2 text-sm"
              >
                <span>{ingredient.name}</span>
                <span className="font-medium tabular-nums">
                  {formatQuantity(scaled)} {ingredient.unit}
                </span>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="rounded-[var(--radius)] bg-surface p-5 shadow-[var(--shadow)]">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <ListOrdered className="h-5 w-5 text-primary" aria-hidden="true" />
          手順
        </h3>
        <ol className="space-y-4">
          {recipe.steps.map((step) => (
            <li key={step.id} className="flex gap-3">
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground"
                aria-hidden="true"
              >
                {step.step_number}
              </span>
              <p className="pt-1">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>
    </article>
  )
}

export function RecipeNotFound() {
  return (
    <div className="flex flex-col items-center gap-4">
      <EmptyState
        title="レシピが見つかりません"
        description="削除されたか、URL が間違っている可能性があります。"
      />
      <Button variant="secondary" asChild>
        <Link to="/recipes">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          一覧へ戻る
        </Link>
      </Button>
    </div>
  )
}
