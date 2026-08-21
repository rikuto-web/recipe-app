/**
 * 一覧 0 件などの空状態（docs/08-ui-design.md §2.1, §4 SC-01）。
 * アイコンは Lucide `UtensilsCrossed` を大きめ（48px 相当）で表示する。
 */
import { UtensilsCrossed } from 'lucide-react'

import { cn } from '#/lib/utils'

type EmptyStateProps = {
  title: string
  description?: string
  className?: string
}

export function EmptyState({
  title,
  description,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-[var(--radius)] border border-border bg-surface px-6 py-12 text-center shadow-[var(--shadow)]',
        className,
      )}
    >
      <UtensilsCrossed
        className="mb-4 h-12 w-12 text-muted"
        aria-hidden="true"
      />
      <h2 className="text-lg font-semibold text-text">{title}</h2>
      {description ? (
        <p className="mt-2 max-w-md text-sm text-muted">{description}</p>
      ) : null}
    </div>
  )
}
