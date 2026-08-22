/**
 * 調理時間（分）の 10 分単位ステッパー。
 * 一覧フィルタ（MaxCookTimeFilter）と新規作成フォームで共通利用する。
 */
import { Minus, Plus } from 'lucide-react'

import { Button } from '#/components/ui/button'
import { cn } from '#/lib/utils'

export const COOK_TIME_STEP_MINUTES = 10

const inputClassName =
  'w-full rounded-lg border border-border bg-bg px-2.5 py-2 text-sm text-text outline-none focus:border-primary'

type CookTimeStepperProps = {
  value: number | ''
  onChange: (value: number | '') => void
  /** 未指定時は 0。新規作成では 10 を指定する */
  minMinutes?: number
  allowEmpty?: boolean
  id?: string
  name?: string
  placeholder?: string
  decreaseLabel?: string
  increaseLabel?: string
  inputAriaLabel?: string
  'aria-invalid'?: boolean
  'aria-describedby'?: string
  className?: string
}

export function CookTimeStepper({
  value,
  onChange,
  minMinutes = 0,
  allowEmpty = false,
  id,
  name,
  placeholder = '0',
  decreaseLabel = '調理時間を10分減らす',
  increaseLabel = '調理時間を10分増やす',
  inputAriaLabel = '調理時間（分）',
  'aria-invalid': ariaInvalid,
  'aria-describedby': ariaDescribedBy,
  className,
}: CookTimeStepperProps) {
  const canDecrease =
    value !== '' &&
    (allowEmpty ? value >= COOK_TIME_STEP_MINUTES : value > minMinutes)

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {name ? <input type="hidden" name={name} value={value} /> : null}
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={decreaseLabel}
        disabled={!canDecrease}
        onClick={() => {
          if (value === '') {
            return
          }
          if (allowEmpty && value <= COOK_TIME_STEP_MINUTES) {
            onChange('')
            return
          }
          onChange(Math.max(minMinutes, value - COOK_TIME_STEP_MINUTES))
        }}
      >
        <Minus className="h-4 w-4" aria-hidden="true" />
      </Button>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        readOnly
        value={value === '' ? '' : String(value)}
        placeholder={allowEmpty ? '指定なし' : placeholder}
        aria-label={inputAriaLabel}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        className={cn(inputClassName, 'text-center')}
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={increaseLabel}
        onClick={() =>
          onChange(
            value === '' ? COOK_TIME_STEP_MINUTES : value + COOK_TIME_STEP_MINUTES,
          )
        }
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  )
}

export function snapCookTimeMinutes(minutes: number): number {
  const snapped = Math.round(minutes / COOK_TIME_STEP_MINUTES) * COOK_TIME_STEP_MINUTES
  return Math.max(0, snapped)
}
