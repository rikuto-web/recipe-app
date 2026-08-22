/**
 * 難易度選択（1〜5）。Lucide `Star` をクリックで変更する。
 */
import { Star } from 'lucide-react'

import { cn } from '#/lib/utils'

type DifficultySelectorProps = {
  value: number
  onChange: (value: number) => void
  error?: string
}

export function DifficultySelector({
  value,
  onChange,
  error,
}: DifficultySelectorProps) {
  const clamped = Math.min(5, Math.max(1, value))

  return (
    <div>
      <div
        className="flex items-center gap-0.5"
        role="radiogroup"
        aria-label="難易度"
        aria-describedby={error ? 'difficulty-error' : undefined}
      >
        {Array.from({ length: 5 }, (_, index) => {
          const starValue = index + 1
          const filled = starValue <= clamped

          return (
            <button
              key={starValue}
              type="button"
              role="radio"
              aria-checked={starValue === clamped}
              aria-label={`難易度 ${starValue}`}
              className="rounded p-0.5 transition-colors hover:bg-primary-light"
              onClick={() => onChange(starValue)}
            >
              <Star
                aria-hidden="true"
                className={cn(
                  'h-5 w-5',
                  filled ? 'fill-star text-star' : 'fill-none text-muted',
                )}
              />
            </button>
          )
        })}
      </div>
      {error ? (
        <p id="difficulty-error" className="mt-1 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}
