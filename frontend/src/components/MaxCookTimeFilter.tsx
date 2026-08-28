/**
 * 調理時間上限フィルタ。10 分単位で増減する。
 * 判定は API 側の「指定分以下」なので、23 分のレシピは上限 30 でヒットする。
 */
import { useState } from 'react'

import { CookTimeStepper } from '#/components/CookTimeStepper'
import { snapMaxCookTimeFilter } from '#/lib/recipeSearch'

type MaxCookTimeFilterProps = {
  defaultValue?: number
}

export function MaxCookTimeFilter({ defaultValue }: MaxCookTimeFilterProps) {
  const [value, setValue] = useState<number | ''>(() =>
    defaultValue === undefined ? '' : snapMaxCookTimeFilter(defaultValue),
  )

  return (
    <CookTimeStepper
      value={value}
      onChange={setValue}
      allowEmpty
      name="max_cook_time"
      decreaseLabel="上限を10分減らす"
      increaseLabel="上限を10分増やす"
      inputAriaLabel="調理時間上限"
    />
  )
}
