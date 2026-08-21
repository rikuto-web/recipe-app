/**
 * 難易度表示（docs/08-ui-design.md §2.1）。
 * DB の `recipes.difficulty`（1〜5）を Lucide `Star` 5 個で描画する。
 * ★/☆ などのテキスト記号は使わない。
 */
import { Star } from 'lucide-react'

import { cn } from '#/lib/utils'

type DifficultyRatingProps = {
  /** 難易度 1〜5（範囲外はクランプ） */
  value: number
  className?: string
}

export function DifficultyRating({ value, className }: DifficultyRatingProps) {
  const clamped = Math.min(5, Math.max(0, value))

  return (
    <div
      className={cn('flex items-center gap-0.5', className)}
      aria-label={`難易度 ${clamped}/5`}
    >
      {Array.from({ length: 5 }, (_, index) => {
        const filled = index < clamped

        return (
          <Star
            key={index}
            role="img"
            aria-hidden="true"
            className={cn(
              'h-4 w-4',
              filled
                ? 'fill-star text-star'
                : 'fill-none text-muted',
            )}
          />
        )
      })}
    </div>
  )
}
