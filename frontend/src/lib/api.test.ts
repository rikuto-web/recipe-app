import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  ApiError,
  ApiValidationError,
  createIngredient,
  createRecipe,
  createStep,
  deleteIngredient,
  deleteRecipe,
  deleteStep,
  loadRecipe,
  loadRecipeList,
  updateIngredient,
  updateRecipe,
  updateStep,
} from '#/lib/api'

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
    const parsed = new URL(recipesUrl ?? '', 'http://localhost')
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

  it('throws on non-400 error responses', async () => {
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
    ).rejects.toThrow('リクエストに失敗しました（HTTP 405）')
  })
})

describe('updateRecipe', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('puts parent fields only and returns detail', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(init?.method).toBe('PUT')
      expect(JSON.parse(String(init?.body))).toEqual({
        title: '味噌ラーメン',
        description: '',
        category_id: 3,
        servings: 4,
        cook_time_minutes: 40,
        difficulty: 4,
      })
      return jsonResponse({
        id: 1,
        title: '味噌ラーメン',
        description: '',
        category: { id: 3, name: '中華' },
        servings: 4,
        cook_time_minutes: 40,
        difficulty: 4,
        ingredients: [],
        steps: [],
        created_at: '2026-08-21T00:00:00Z',
        updated_at: '2026-08-22T00:00:00Z',
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const recipe = await updateRecipe(1, {
      title: '味噌ラーメン',
      description: '',
      category_id: 3,
      servings: 4,
      cook_time_minutes: 40,
      difficulty: 4,
    })

    expect(recipe.title).toBe('味噌ラーメン')
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/recipes\/1$/),
      expect.objectContaining({ method: 'PUT' }),
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
      updateRecipe(1, {
        title: '',
        description: '',
        category_id: 1,
        servings: 2,
        cook_time_minutes: 30,
        difficulty: 3,
      }),
    ).rejects.toMatchObject({
      name: 'ApiValidationError',
      fieldErrors: { title: 'タイトルは必須です' },
    } satisfies Partial<ApiValidationError>)
  })
})

describe('ingredient and step row APIs', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('patches one ingredient row', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(init?.method).toBe('PATCH')
      expect(JSON.parse(String(init?.body))).toEqual({ quantity: 15 })
      return jsonResponse({
        id: 10,
        sort_order: 1,
        name: '中華麺',
        quantity: 15,
        unit: 'g',
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const row = await updateIngredient(1, 10, { quantity: 15 })

    expect(row.quantity).toBe(15)
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/recipes\/1\/ingredients\/10$/),
      expect.objectContaining({ method: 'PATCH' }),
    )
  })

  it('posts a new ingredient row', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(init?.method).toBe('POST')
      return jsonResponse(
        { id: 12, sort_order: 3, name: 'ネギ', quantity: 10, unit: 'g' },
        true,
        201,
      )
    })
    vi.stubGlobal('fetch', fetchMock)

    const row = await createIngredient(1, {
      name: 'ネギ',
      quantity: 10,
      unit: 'g',
      sort_order: 3,
    })

    expect(row.id).toBe(12)
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/recipes\/1\/ingredients$/),
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('deletes an ingredient row', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ message: 'deleted' }))
    vi.stubGlobal('fetch', fetchMock)

    await deleteIngredient(1, 11)

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/recipes\/1\/ingredients\/11$/),
      expect.objectContaining({ method: 'DELETE' }),
    )
  })

  it('patches one step row', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(init?.method).toBe('PATCH')
      return jsonResponse({
        id: 21,
        step_number: 2,
        body: '麺を al dente になるまで茹でる',
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const row = await updateStep(1, 21, {
      body: '麺を al dente になるまで茹でる',
    })

    expect(row.body).toContain('al dente')
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/recipes\/1\/steps\/21$/),
      expect.objectContaining({ method: 'PATCH' }),
    )
  })

  it('posts a new step row and deletes a step row', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'POST') {
        return jsonResponse(
          { id: 22, step_number: 3, body: '盛り付ける' },
          true,
          201,
        )
      }
      return jsonResponse({ message: 'deleted' })
    })
    vi.stubGlobal('fetch', fetchMock)

    const created = await createStep(1, { body: '盛り付ける' })
    await deleteStep(1, 20)

    expect(created.step_number).toBe(3)
    const urls = fetchMock.mock.calls.map(([input, init]) => [
      String(input),
      init?.method,
    ])
    expect(urls[0]?.[0]).toMatch(/\/api\/recipes\/1\/steps$/)
    expect(urls[0]?.[1]).toBe('POST')
    expect(urls[1]?.[0]).toMatch(/\/api\/recipes\/1\/steps\/20$/)
    expect(urls[1]?.[1]).toBe('DELETE')
  })

  it('deletes a recipe', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ message: 'deleted' }))
    vi.stubGlobal('fetch', fetchMock)

    await deleteRecipe(1)

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/recipes\/1$/),
      expect.objectContaining({ method: 'DELETE' }),
    )
  })
})
