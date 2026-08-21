import { afterEach, describe, expect, it, vi } from 'vitest'

import { loadRecipeList } from '#/lib/api'

function jsonResponse(body: unknown, ok = true): Response {
  return {
    ok,
    json: async () => body,
  } as Response
}

describe('loadRecipeList', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('loads recipes and categories with search params', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/api/categories')) {
        return jsonResponse({
          categories: [{ id: 3, name: '中華' }],
        })
      }
      if (url.includes('/api/recipes')) {
        return jsonResponse({
          recipes: [
            {
              id: 1,
              title: '醤油ラーメン',
              category: { id: 3, name: '中華' },
              servings: 2,
              cook_time_minutes: 30,
              difficulty: 3,
              created_at: '2026-03-01T00:00:00Z',
              updated_at: '2026-03-01T00:00:00Z',
            },
          ],
          total: 1,
        })
      }
      throw new Error(`unexpected url: ${url}`)
    })

    vi.stubGlobal('fetch', fetchMock)

    const data = await loadRecipeList({ q: 'ラーメン', category_id: 3 })

    expect(data.total).toBe(1)
    expect(data.recipes[0]?.title).toBe('醤油ラーメン')
    expect(data.categories).toEqual([{ id: 3, name: '中華' }])

    const urls = fetchMock.mock.calls.map(([input]) => String(input))
    const recipesUrl = urls.find((url) => url.includes('/api/recipes'))
    expect(recipesUrl).toBeDefined()
    const parsed = new URL(recipesUrl ?? '')
    expect(parsed.searchParams.get('q')).toBe('ラーメン')
    expect(parsed.searchParams.get('category_id')).toBe('3')
    expect(urls.some((url) => url.endsWith('/api/categories'))).toBe(true)
  })
})
