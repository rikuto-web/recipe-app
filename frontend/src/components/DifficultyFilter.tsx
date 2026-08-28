/**
 * 難易度フィルタ。native select では Lucide を描けないため、
 * `DifficultyRating` の星で選ぶカスタムセレクターにする。
 */
import { useEffect, useId, useRef, useState } from 'react'

import { DifficultyRating } from '#/components/DifficultyRating'
import { cn } from '#/lib/utils'

const controlClassName =
  'w-full rounded-lg border border-border bg-bg px-2.5 py-2 text-sm text-text outline-none focus:border-primary'

type DifficultyFilterProps = {
  defaultValue?: number
}

export function DifficultyFilter({ defaultValue }: DifficultyFilterProps) {
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState<number | ''>(defaultValue ?? '')

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const select = (next: number | '') => {
    setValue(next)
    setOpen(false)
  }

  return (
    <div ref={rootRef} className="relative">
      <input type="hidden" name="difficulty" value={value} />
      <button
        type="button"
        aria-label="難易度"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((current) => !current)}
        className={cn(controlClassName, 'flex h-[38px] items-center')}
      >
        {value === '' ? (
          <span className="text-muted">すべて</span>
        ) : (
          <DifficultyRating value={value} />
        )}
      </button>
      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-label="難易度"
          className="absolute z-20 mt-1 w-max min-w-full rounded-lg border border-border bg-surface p-1 shadow-[var(--shadow)]"
        >
          <li role="option" aria-selected={value === ''}>
            <button
              type="button"
              className="flex w-full rounded-md px-2 py-1.5 text-left text-sm text-muted hover:bg-primary-light"
              onClick={() => select('')}
            >
              すべて
            </button>
          </li>
          {([1, 2, 3, 4, 5] as const).map((difficulty) => (
            <li
              key={difficulty}
              role="option"
              aria-selected={value === difficulty}
            >
              <button
                type="button"
                className="flex w-full rounded-md px-2 py-1.5 hover:bg-primary-light"
                onClick={() => select(difficulty)}
                aria-label={`難易度 ${difficulty}`}
              >
                <DifficultyRating value={difficulty} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
