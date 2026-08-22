import { afterEach, describe, expect, it, vi } from 'vitest'

import { ApiError, ApiValidationError, createRecipe, loadRecipe, loadRecipeList } from '#/lib/api'

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

describe('createRecipe', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('posts a recipe payload and returns detail', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(init?.method).toBe('POST')
      expect(JSON.parse(String(init?.body))).toMatchObject({
        title: '醤油ラーメン',
        category_id: 1,
      })
      return jsonResponse(
        {
          id: 5,
          title: '醤油ラーメン',
          description: '',
          category: { id: 1, name: '和食' },
          servings: 2,
          cook_time_minutes: 30,
          difficulty: 3,
          ingredients: [],
          steps: [],
          created_at: '2026-08-21T00:00:00Z',
          updated_at: '2026-08-21T00:00:00Z',
        },
        true,
        201,
      )
    })
    vi.stubGlobal('fetch', fetchMock)

    const recipe = await createRecipe({
      title: '醤油ラーメン',
      description: '',
      category_id: 1,
      servings: 2,
      cook_time_minutes: 30,
      difficulty: 3,
      ingredients: [
        { sort_order: 1, name: '中華麺', quantity: 120, unit: 'g' },
      ],
      steps: [{ step_number: 1, body: 'スープを作る' }],
    })

    expect(recipe.id).toBe(5)
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/recipes$/),
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('throws ApiValidationError on 400', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse(
          {
            error: {
              code: 'VALIDATION_ERROR',
              message: '入力内容に誤りがあります',
              details: [{ field: 'title', message: 'タイトルは必須です' }],
            },
          },
          false,
          400,
        ),
      ),
    )

    await expect(
      createRecipe({
        title: '',
        description: '',
        category_id: 1,
        servings: 2,
        cook_time_minutes: 30,
        difficulty: 3,
        ingredients: [],
        steps: [],
      }),
    ).rejects.toMatchObject({
      name: 'ApiValidationError',
      fieldErrors: { title: 'タイトルは必須です' },
    } satisfies Partial<ApiValidationError>)
  })

  it('throws a helpful error on 405 when POST is unavailable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse('', false, 405)),
    )

    await expect(
      createRecipe({
        title: '醤油ラーメン',
        description: '',
        category_id: 1,
        servings: 2,
        cook_time_minutes: 30,
        difficulty: 3,
        ingredients: [{ sort_order: 1, name: '中華麺', quantity: 120, unit: 'g' }],
        steps: [{ step_number: 1, body: 'スープを作る' }],
      }),
    ).rejects.toThrow('バックエンドを再起動')
  })
})
