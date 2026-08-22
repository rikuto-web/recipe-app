/**
 * 人数按分（docs/01-functional-requirements.md §4.6）。
 * クライアントのみ。API は呼ばず、結果も保存しない。
 *
 * `quantity * displayServings / baseServings`
 */

/** 基準人数に対する表示人数の比率で分量を按分する。 */
export function scaleQuantity(
  quantity: number,
  baseServings: number,
  displayServings: number,
): number {
  if (baseServings <= 0) {
    return quantity
  }

  return (quantity * displayServings) / baseServings
}

/** 按分結果を表示用文字列にする（整数はそのまま、小数は最大 2 桁）。 */
export function formatQuantity(value: number): string {
  const rounded = Math.round(value * 100) / 100
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2)
}
