import { afterEach, describe, expect, it, vi } from 'vitest'

import { ApiError, loadRecipe, loadRecipeList } from '#/lib/api'

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
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

describe('loadRecipe', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('loads a recipe detail by id', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        id: 1,
        title: '醤油ラーメン',
        description: 'シンプルな醤油ラーメン',
        category: { id: 1, name: '和食' },
        servings: 2,
        cook_time_minutes: 30,
        difficulty: 3,
        ingredients: [
          { id: 10, sort_order: 1, name: '中華麺', quantity: 120, unit: 'g' },
        ],
        steps: [{ id: 20, step_number: 1, body: 'スープを作る' }],
        created_at: '2026-08-21T00:00:00Z',
        updated_at: '2026-08-21T00:00:00Z',
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const recipe = await loadRecipe(1)

    expect(recipe.title).toBe('醤油ラーメン')
    expect(recipe.ingredients).toHaveLength(1)
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/recipes\/1$/),
    )
  })

  it('throws ApiError on 404', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ error: { code: 'NOT_FOUND' } }, false, 404)),
    )

    await expect(loadRecipe(999)).rejects.toMatchObject({
      name: 'ApiError',
      status: 404,
    } satisfies Partial<ApiError>)
  })
})
