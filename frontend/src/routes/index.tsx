/**
 * SC-01 レシピ一覧（Walking Skeleton）。
 * VS-01 で API 連携・フィルタバーを実装するまで、共通コンポーネントのプレビュー画面。
 */
import { createFileRoute } from '@tanstack/react-router'

import { DifficultyRating } from '#/components/DifficultyRating'
import { EmptyState } from '#/components/EmptyState'

export const Route = createFileRoute('/')({ component: HomePage })

function HomePage() {
  return (
    <div className="space-y-6">
      <EmptyState
        title="レシピがまだありません"
        description="新規作成ボタンから最初のレシピを追加できます。"
      />
      <section
        aria-label="コンポーネントプレビュー"
        className="rounded-[var(--radius)] border border-border bg-surface p-4 shadow-[var(--shadow)]"
      >
        <p className="mb-2 text-sm text-muted">難易度表示（サンプル）</p>
        <DifficultyRating value={3} />
      </section>
    </div>
  )
}
