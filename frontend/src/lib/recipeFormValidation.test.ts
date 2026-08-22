import { describe, expect, it } from 'vitest'

import {
  createInitialFormValues,
  normalizeFieldErrors,
  normalizeNumericInput,
  validateRecipeForm,
  validateRecipeFormField,
} from '#/lib/recipeFormValidation'

describe('validateRecipeForm', () => {
  it('requires title, category, ingredients, and steps', () => {
    const errors = validateRecipeForm(createInitialFormValues())

    expect(errors.title).toBe('タイトルは必須です')
    expect(errors.category_id).toBe('カテゴリは必須です')
    expect(errors['ingredients.0.name']).toBe('材料名は必須です')
    expect(errors['ingredients.0.quantity']).toBe('分量は 0 より大きい数値です')
    expect(errors['ingredients.0.unit']).toBe('単位は必須です')
    expect(errors['steps.0.body']).toBe('手順本文は必須です')
  })

  it('accepts a valid form', () => {
    const values = createInitialFormValues(1)
    values.title = '醤油ラーメン'
    values.ingredients[0] = {
      key: 'i1',
      name: '中華麺',
      quantity: '120',
      unit: 'g',
    }
    values.steps[0] = {
      key: 's1',
      body: 'スープを作る',
    }

    expect(validateRecipeForm(values)).toEqual({})
  })

  it('accepts full-width digits in quantity', () => {
    const values = createInitialFormValues(1)
    values.title = '醤油ラーメン'
    values.ingredients[0] = {
      key: 'i1',
      name: '中華麺',
      quantity: '１２０',
      unit: 'g',
    }
    values.steps[0] = {
      key: 's1',
      body: 'スープを作る',
    }

    expect(validateRecipeForm(values)).toEqual({})
  })

  it('rejects zero cook time', () => {
    const values = createInitialFormValues(1)
    values.title = '醤油ラーメン'
    values.cook_time_minutes = '0'
    values.ingredients[0] = {
      key: 'i1',
      name: '中華麺',
      quantity: '120',
      unit: 'g',
    }
    values.steps[0] = {
      key: 's1',
      body: 'スープを作る',
    }

    expect(validateRecipeForm(values).cook_time_minutes).toBe(
      '調理時間は 10 分以上（10分単位）です',
    )
  })
})

describe('validateRecipeFormField', () => {
  it('does not require empty fields while typing', () => {
    const values = createInitialFormValues(1)

    expect(validateRecipeFormField(values, 'title')).toBeUndefined()
    expect(validateRecipeFormField(values, 'ingredients.0.name')).toBeUndefined()
    expect(validateRecipeFormField(values, 'ingredients.0.unit')).toBeUndefined()
    expect(validateRecipeFormField(values, 'steps.0.body')).toBeUndefined()
  })

  it('shows format errors for invalid quantity without requiring other fields', () => {
    const values = createInitialFormValues(1)
    values.ingredients[0].quantity = 'abc'

    expect(validateRecipeFormField(values, 'ingredients.0.quantity')).toBe(
      '分量は 0 より大きい数値です',
    )
    expect(validateRecipeFormField(values, 'ingredients.0.name')).toBeUndefined()
  })

  it('requires empty fields on submit validation', () => {
    const values = createInitialFormValues(1)

    expect(
      validateRecipeFormField(values, 'ingredients.0.name', { required: true }),
    ).toBe('材料名は必須です')
  })

  it('does not require empty description while typing', () => {
    const values = createInitialFormValues(1)

    expect(validateRecipeFormField(values, 'description')).toBeUndefined()
  })

  it('requires step body on submit validation', () => {
    const values = createInitialFormValues(1)
    values.title = '醤油ラーメン'
    values.ingredients[0] = {
      key: 'i1',
      name: '中華麺',
      quantity: '120',
      unit: 'g',
    }

    expect(
      validateRecipeFormField(values, 'steps.0.body', { required: true }),
    ).toBe('手順本文は必須です')
  })
})

describe('normalizeFieldErrors', () => {
  it('converts bracket indices to dot notation', () => {
    expect(
      normalizeFieldErrors({
        'ingredients[0].quantity': '分量は 0 より大きい数値です',
        'steps[1].body': '手順本文は必須です',
      }),
    ).toEqual({
      'ingredients.0.quantity': '分量は 0 より大きい数値です',
      'steps.1.body': '手順本文は必須です',
    })
  })
})

describe('normalizeNumericInput', () => {
  it('converts full-width digits and decimal point to half-width', () => {
    expect(normalizeNumericInput('１２０')).toBe('120')
    expect(normalizeNumericInput('１．５')).toBe('1.5')
    expect(normalizeNumericInput('120')).toBe('120')
  })
})
