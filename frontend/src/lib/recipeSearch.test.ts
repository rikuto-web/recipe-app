import { describe, expect, it } from 'vitest'

import {
  hasActiveFilters,
  parseRecipeSearch,
  toRecipeQueryString,
} from '#/lib/recipeSearch'

describe('parseRecipeSearch', () => {
  it('parses filter search params', () => {
    expect(
      parseRecipeSearch({
        q: 'ラーメン',
        category_id: '3',
        difficulty: '2',
        max_cook_time: '30',
        sort: 'cook_time_asc',
      }),
    ).toEqual({
      q: 'ラーメン',
      category_id: 3,
      difficulty: 2,
      max_cook_time: 30,
      sort: 'cook_time_asc',
    })
  })

  it('snaps max_cook_time to 10-minute steps for filter UI and API', () => {
    expect(
      parseRecipeSearch({
        max_cook_time: '25',
      }),
    ).toEqual({
      max_cook_time: 30,
    })

    expect(
      parseRecipeSearch({
        max_cook_time: '23',
      }),
    ).toEqual({
      max_cook_time: 20,
    })
  })

  it('drops empty and invalid values and default sort', () => {
    expect(
      parseRecipeSearch({
        q: '  ',
        category_id: 'abc',
        difficulty: '9',
        max_cook_time: '-1',
        sort: 'newest',
      }),
    ).toEqual({})
  })
})

describe('toRecipeQueryString', () => {
  it('serializes filters for the recipes API', () => {
    const params = new URLSearchParams(
      toRecipeQueryString({
        q: 'ラーメン',
        category_id: 3,
        max_cook_time: 30,
        sort: 'cook_time_asc',
      }),
    )

    expect(params.get('q')).toBe('ラーメン')
    expect(params.get('category_id')).toBe('3')
    expect(params.get('max_cook_time')).toBe('30')
    expect(params.get('sort')).toBe('cook_time_asc')
  })
})

describe('hasActiveFilters', () => {
  it('is true when a narrowing filter is set', () => {
    expect(hasActiveFilters({ q: '麺' })).toBe(true)
    expect(hasActiveFilters({ sort: 'cook_time_asc' })).toBe(false)
    expect(hasActiveFilters({})).toBe(false)
  })
})
