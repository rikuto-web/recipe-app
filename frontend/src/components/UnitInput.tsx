/**
 * 単位入力。候補リストは入力欄直下に表示する（datalist は位置ずれするため使わない）。
 */
import { useEffect, useId, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

import { cn } from '#/lib/utils'
import { UNIT_SUGGESTIONS } from '#/lib/recipeFormValidation'

type UnitInputProps = {
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  'aria-label'?: string
  suggestions?: readonly string[]
  hasError?: boolean
  'aria-describedby'?: string
  className?: string
}

export function UnitInput({
  value,
  onChange,
  onBlur,
  'aria-label': ariaLabel = '単位',
  suggestions = UNIT_SUGGESTIONS,
  hasError = false,
  'aria-describedby': ariaDescribedBy,
  className,
}: UnitInputProps) {
  const [open, setOpen] = useState(false)
  const [filterActive, setFilterActive] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const listId = useId()
  const normalized = value.trim().toLowerCase()
  const displayed =
    filterActive && normalized
      ? suggestions.filter((unit) => unit.toLowerCase().includes(normalized))
      : [...suggestions]

  function openFullList() {
    setFilterActive(false)
    setOpen(true)
  }

  function closeList() {
    setOpen(false)
    setFilterActive(false)
  }

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        closeList()
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="flex">
        <input
          type="text"
          value={value}
          role="combobox"
          aria-label={ariaLabel}
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-invalid={hasError}
          aria-describedby={ariaDescribedBy}
          placeholder="g"
          className={cn(
            'min-w-0 flex-1 rounded-l-[var(--radius)] border bg-background px-3 py-2 text-sm outline-none transition-colors',
            hasError
              ? 'border-destructive focus-visible:ring-[3px] focus-visible:ring-destructive/20'
              : 'border-input focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
            open ? 'rounded-bl-none' : '',
          )}
          onChange={(event) => {
            onChange(event.target.value)
            setFilterActive(true)
            setOpen(true)
          }}
          onFocus={openFullList}
          onBlur={onBlur}
        />
        <button
          type="button"
          aria-label="単位候補を表示"
          aria-expanded={open}
          aria-controls={listId}
          className={cn(
            'inline-flex shrink-0 items-center justify-center rounded-r-[var(--radius)] border border-l-0 bg-background px-2 text-muted transition-colors hover:bg-primary-light hover:text-primary',
            hasError ? 'border-destructive' : 'border-input',
            open ? 'rounded-br-none' : '',
          )}
          onClick={() => {
            if (open) {
              closeList()
              return
            }
            openFullList()
          }}
        >
          <ChevronDown className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {open && displayed.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-50 mt-0 max-h-48 overflow-auto rounded-b-[var(--radius)] border border-t-0 border-border bg-surface py-1 shadow-[var(--shadow)]"
        >
          {displayed.map((unit) => (
            <li key={unit} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={unit === value}
                className={cn(
                  'w-full px-3 py-2 text-left text-sm hover:bg-primary-light',
                  unit === value ? 'bg-primary-light font-medium text-primary' : '',
                )}
                onMouseDown={(event) => {
                  event.preventDefault()
                  onChange(unit)
                  closeList()
                }}
              >
                {unit}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
