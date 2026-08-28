/**
 * SC-03 レシピ新規作成。
 * 一覧からの SPA 遷移では sessionStorage の categories を優先する。
 */
import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { EmptyState } from '#/components/EmptyState'
import { RecipeCreatePage } from '#/components/RecipeCreatePage'
import { loadCategories, type Category } from '#/lib/api'
import {
  loadCategoriesSession,
  saveCategoriesSession,
} from '#/lib/categorySession'

export const Route = createFileRoute('/recipes/new')({
  component: RecipeCreateRoute,
})

function RecipeCreateRoute() {
  const [categories, setCategories] = useState<Category[] | null>(() =>
    loadCategoriesSession(),
  )
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const cached = loadCategoriesSession()
    if (cached?.length) {
      setCategories(cached)
      setFailed(false)
      return
    }
    if (categories?.length) return

    let cancelled = false
    void loadCategories()
      .then((data) => {
        if (!cancelled) {
          saveCategoriesSession(data)
          setCategories(data)
          setFailed(false)
        }
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })

    return () => {
      cancelled = true
    }
  }, [categories])

  if (failed && !categories?.length) {
    return <CreateError />
  }
  if (!categories?.length) {
    return (
      <EmptyState
        title="作成画面を読み込んでいます"
        description="少々お待しください。"
      />
    )
  }
  return <RecipeCreatePage categories={categories} />
}

function CreateError() {
  return (
    <div className="flex flex-col items-center">
      <EmptyState
        title="作成画面を開けませんでした"
        description="時間をおいて再度お試しください。"
      />
      <button
        type="button"
        className="mt-4 rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground"
        onClick={() => {
          window.location.reload()
        }}
      >
        再読み込み
      </button>
    </div>
  )
}
