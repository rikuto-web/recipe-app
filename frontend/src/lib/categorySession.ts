/**
 * 同一タブ内の SPA 遷移向けにカテゴリ一覧を sessionStorage に保持する。
 */
import type { Category } from '#/lib/api'

const STORAGE_KEY = 'recipe-app:categories'

export function saveCategoriesSession(categories: Category[]): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(categories))
  } catch {
    // sessionStorage が使えない環境では無視
  }
}

export function loadCategoriesSession(): Category[] | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Category[]
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null
  } catch {
    return null
  }
}
