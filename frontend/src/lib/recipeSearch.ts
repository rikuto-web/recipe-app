/**
 * 一覧の search params（docs/04-screen-transitions.md §3, docs/06-api.md §5）。
 * 未指定・不正値は落とす。既定の sort=newest は URL に載せない。
 */

export type RecipeSort = 'newest' | 'cook_time_asc'

export const MAX_COOK_TIME_FILTER_STEP_MINUTES = 10

export type RecipeSearch = {
  q?: string
  category_id?: number
  difficulty?: number
  max_cook_time?: number
  sort?: RecipeSort
}

export function parseRecipeSearch(
  search: Record<string, unknown>,
): RecipeSearch {
  const q = parseOptionalString(search.q)
  const category_id = parsePositiveInt(search.category_id)
  const difficulty = parseIntInRange(search.difficulty, 1, 5)
  const max_cook_time = parseMaxCookTimeFilter(search.max_cook_time)
  const sort = parseSort(search.sort)

  return {
    ...(q ? { q } : {}),
    ...(category_id !== undefined ? { category_id } : {}),
    ...(difficulty !== undefined ? { difficulty } : {}),
    ...(max_cook_time !== undefined ? { max_cook_time } : {}),
    ...(sort && sort !== 'newest' ? { sort } : {}),
  }
}

export function toRecipeQueryString(search: RecipeSearch): string {
  const params = new URLSearchParams()

  if (search.q) params.set('q', search.q)
  if (search.category_id !== undefined) {
    params.set('category_id', String(search.category_id))
  }
  if (search.difficulty !== undefined) {
    params.set('difficulty', String(search.difficulty))
  }
  if (search.max_cook_time !== undefined) {
    params.set('max_cook_time', String(search.max_cook_time))
  }
  if (search.sort && search.sort !== 'newest') {
    params.set('sort', search.sort)
  }

  return params.toString()
}

export function hasActiveFilters(search: RecipeSearch): boolean {
  return (
    Boolean(search.q) ||
    search.category_id !== undefined ||
    search.difficulty !== undefined ||
    search.max_cook_time !== undefined
  )
}

function parseOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed
}

function parsePositiveInt(value: unknown): number | undefined {
  const parsed = parseIntValue(value)
  return parsed !== undefined && parsed >= 1 ? parsed : undefined
}

function parseNonNegativeInt(value: unknown): number | undefined {
  const parsed = parseIntValue(value)
  return parsed !== undefined && parsed >= 0 ? parsed : undefined
}

/** 一覧フィルタの調理時間上限を 10 分単位に揃える（UI 表示・API クエリと一致させる） */
export function snapMaxCookTimeFilter(minutes: number): number {
  const snapped =
    Math.round(minutes / MAX_COOK_TIME_FILTER_STEP_MINUTES) *
    MAX_COOK_TIME_FILTER_STEP_MINUTES
  return Math.max(MAX_COOK_TIME_FILTER_STEP_MINUTES, snapped)
}

function parseMaxCookTimeFilter(value: unknown): number | undefined {
  const parsed = parseNonNegativeInt(value)
  if (parsed === undefined) {
    return undefined
  }
  return snapMaxCookTimeFilter(parsed)
}

function parseIntInRange(
  value: unknown,
  min: number,
  max: number,
): number | undefined {
  const parsed = parseIntValue(value)
  return parsed !== undefined && parsed >= min && parsed <= max
    ? parsed
    : undefined
}

function parseIntValue(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isInteger(value)) return value
  if (typeof value !== 'string' || value.trim() === '') return undefined

  const parsed = Number(value)
  return Number.isInteger(parsed) ? parsed : undefined
}

function parseSort(value: unknown): RecipeSort | undefined {
  if (value === 'cook_time_asc' || value === 'newest') return value
  return undefined
}
