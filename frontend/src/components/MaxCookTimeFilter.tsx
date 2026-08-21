/**
 * 調理時間上限フィルタ。10 分単位で増減する。
 * 判定は API 側の「指定分以下」なので、23 分のレシピは上限 30 でヒットする。
 */
import { useState } from 'react'
import { Minus, Plus } from 'lucide-react'

import { Button } from '#/components/ui/button'
import { cn } from '#/lib/utils'

const STEP_MINUTES = 10

const controlClassName =
  'w-full rounded-lg border border-border bg-bg px-2.5 py-2 text-sm text-text outline-none focus:border-primary'

type MaxCookTimeFilterProps = {
  defaultValue?: number
}

export function MaxCookTimeFilter({ defaultValue }: MaxCookTimeFilterProps) {
  const [value, setValue] = useState<number | ''>(() =>
    defaultValue === undefined ? '' : snapToStep(defaultValue),
  )

  return (
    <div className="flex items-center gap-1">
      <input type="hidden" name="max_cook_time" value={value} />
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="上限を10分減らす"
        disabled={value === ''}
        onClick={() =>
          setValue((current) =>
            current === '' || current <= STEP_MINUTES
              ? ''
              : current - STEP_MINUTES,
          )
        }
      >
        <Minus className="h-4 w-4" aria-hidden="true" />
      </Button>
      <input
        type="text"
        inputMode="numeric"
        readOnly
        value={value === '' ? '' : String(value)}
        placeholder="指定なし"
        aria-label="調理時間上限"
        className={cn(controlClassName, 'text-center')}
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="上限を10分増やす"
        onClick={() =>
          setValue((current) =>
            current === '' ? STEP_MINUTES : current + STEP_MINUTES,
          )
        }
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  )
}

function snapToStep(minutes: number): number {
  const snapped = Math.round(minutes / STEP_MINUTES) * STEP_MINUTES
  return Math.max(STEP_MINUTES, snapped)
}
