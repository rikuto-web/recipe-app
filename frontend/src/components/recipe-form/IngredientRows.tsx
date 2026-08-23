import { Plus, Trash2 } from 'lucide-react'

import { UnitInput } from '#/components/UnitInput'
import { Field, inputClass } from '#/components/form/Field'
import { Button } from '#/components/ui/button'
import {
  createEmptyIngredientRow,
  normalizeNumericInput,
  type IngredientFormRow,
  type RecipeFormErrors,
  type RecipeFormValues,
} from '#/lib/recipeFormValidation'

type IngredientRowsProps = {
  values: RecipeFormValues
  errors: RecipeFormErrors
  onUpdate: (
    next: RecipeFormValues,
    changedField?: string,
    options?: { clearErrors?: boolean },
  ) => void
  onBlur: (field: string, next: RecipeFormValues) => void
  onDelete: (index: number) => void
  variant?: 'create' | 'edit'
}

export function IngredientRows({
  values,
  errors,
  onUpdate,
  onBlur,
  onDelete,
  variant = 'create',
}: IngredientRowsProps) {
  function handleAddRow() {
    onUpdate(
      {
        ...values,
        ingredients: [...values.ingredients, createEmptyIngredientRow()],
      },
      undefined,
      variant === 'create' ? { clearErrors: true } : undefined,
    )
  }

  function updateIngredient(
    index: number,
    ingredient: IngredientFormRow,
    changedField?: string,
  ) {
    const next = [...values.ingredients]
    next[index] = ingredient
    onUpdate({ ...values, ingredients: next }, changedField)
  }

  return (
    <section className="rounded-[var(--radius)] bg-surface p-5 shadow-[var(--shadow)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">材料 *</h3>
        <Button type="button" variant="secondary" size="sm" onClick={handleAddRow}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          行を追加
        </Button>
      </div>
      {errors.ingredients ? (
        <p className="mb-3 text-sm text-destructive">{errors.ingredients}</p>
      ) : null}
      <div className="space-y-3">
        <div className="hidden px-3 text-sm font-medium sm:grid sm:grid-cols-[1fr_120px_120px_auto] sm:gap-3">
          <span>材料名 *</span>
          <span>分量 *</span>
          <span>単位 *</span>
          {variant === 'create' ? (
            <span aria-hidden="true" className="w-9" />
          ) : (
            <span className="sr-only">操作</span>
          )}
        </div>
        {values.ingredients.map((ingredient, index) => (
          <div
            key={ingredient.key}
            className="grid gap-3 rounded-[var(--radius)] border border-border p-3 sm:grid-cols-[1fr_120px_120px_auto] sm:items-start"
          >
            <Field
              error={errors[`ingredients.${index}.name`]}
              errorId={`ingredients-${index}-name-error`}
            >
              <input
                type="text"
                value={ingredient.name}
                aria-label={
                  variant === 'create' ? '材料名' : `材料名 ${index + 1}`
                }
                aria-required="true"
                onChange={(event) => {
                  updateIngredient(
                    index,
                    { ...ingredient, name: event.target.value },
                    `ingredients.${index}.name`,
                  )
                }}
                onBlur={(event) => {
                  const next = [...values.ingredients]
                  next[index] = { ...ingredient, name: event.target.value }
                  onBlur(`ingredients.${index}.name`, {
                    ...values,
                    ingredients: next,
                  })
                }}
                aria-invalid={Boolean(errors[`ingredients.${index}.name`])}
                aria-describedby={
                  errors[`ingredients.${index}.name`]
                    ? `ingredients-${index}-name-error`
                    : undefined
                }
                className={inputClass(Boolean(errors[`ingredients.${index}.name`]))}
                placeholder={variant === 'create' ? '例: 中華麺' : undefined}
              />
            </Field>
            <Field
              error={errors[`ingredients.${index}.quantity`]}
              errorId={`ingredients-${index}-quantity-error`}
            >
              <input
                type="text"
                inputMode="decimal"
                value={ingredient.quantity}
                aria-label={
                  variant === 'create' ? '分量' : `分量 ${index + 1}`
                }
                aria-required="true"
                onChange={(event) => {
                  updateIngredient(
                    index,
                    {
                      ...ingredient,
                      quantity: normalizeNumericInput(event.target.value),
                    },
                    `ingredients.${index}.quantity`,
                  )
                }}
                onBlur={(event) => {
                  const next = [...values.ingredients]
                  next[index] = {
                    ...ingredient,
                    quantity: normalizeNumericInput(event.target.value),
                  }
                  onBlur(`ingredients.${index}.quantity`, {
                    ...values,
                    ingredients: next,
                  })
                }}
                aria-invalid={Boolean(errors[`ingredients.${index}.quantity`])}
                aria-describedby={
                  errors[`ingredients.${index}.quantity`]
                    ? `ingredients-${index}-quantity-error`
                    : undefined
                }
                className={inputClass(
                  Boolean(errors[`ingredients.${index}.quantity`]),
                )}
              />
            </Field>
            <Field
              error={errors[`ingredients.${index}.unit`]}
              errorId={`ingredients-${index}-unit-error`}
            >
              <UnitInput
                value={ingredient.unit}
                aria-label={variant === 'create' ? '単位' : `単位 ${index + 1}`}
                onChange={(unit) => {
                  updateIngredient(
                    index,
                    { ...ingredient, unit },
                    `ingredients.${index}.unit`,
                  )
                }}
                onBlur={() => {
                  onBlur(`ingredients.${index}.unit`, values)
                }}
                hasError={Boolean(errors[`ingredients.${index}.unit`])}
                aria-describedby={
                  errors[`ingredients.${index}.unit`]
                    ? `ingredients-${index}-unit-error`
                    : undefined
                }
              />
            </Field>
            <div
              className={`flex items-center justify-end self-center ${
                variant === 'create' ? 'sm:justify-center' : ''
              }`}
            >
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label={`材料 ${index + 1} を削除`}
                disabled={values.ingredients.length <= 1}
                onClick={() => onDelete(index)}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
