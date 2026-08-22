/**
 * SC-03 レシピ新規作成（docs/04-screen-transitions.md, docs/08-ui-design.md §4）。
 */
import { useRef, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react'

import { DifficultySelector } from '#/components/DifficultySelector'
import { CookTimeStepper } from '#/components/CookTimeStepper'
import { UnitInput } from '#/components/UnitInput'
import { Button } from '#/components/ui/button'
import {
  ApiValidationError,
  createRecipe,
  type Category,
} from '#/lib/api'
import {
  createEmptyIngredientRow,
  createEmptyStepRow,
  createInitialFormValues,
  isRecipeFormDirty,
  normalizeFieldErrors,
  normalizeNumericInput,
  toCreateRecipePayload,
  validateRecipeForm,
  validateRecipeFormField,
  type RecipeFormErrors,
  type RecipeFormValues,
} from '#/lib/recipeFormValidation'

type RecipeCreatePageProps = {
  categories: Category[]
}

export function RecipeCreatePage({ categories }: RecipeCreatePageProps) {
  const navigate = useNavigate()
  const cancelDialogRef = useRef<HTMLDialogElement>(null)
  const defaultCategoryId = categories[0]?.id
  const [baseline] = useState(() => createInitialFormValues(defaultCategoryId))
  const [values, setValues] = useState<RecipeFormValues>(() =>
    createInitialFormValues(defaultCategoryId),
  )
  const [errors, setErrors] = useState<RecipeFormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function applyFieldError(
    next: RecipeFormValues,
    field: string,
    checkRequired: boolean,
  ) {
    const message = validateRecipeFormField(next, field, {
      required: checkRequired,
    })
    setErrors((current) => {
      const nextErrors = { ...current }
      if (message) {
        nextErrors[field] = message
      } else {
        delete nextErrors[field]
      }
      return nextErrors
    })
  }

  function handleFieldBlur(field: string, next: RecipeFormValues) {
    applyFieldError(next, field, true)
  }

  function updateValues(
    next: RecipeFormValues,
    changedField?: string,
    options?: { clearErrors?: boolean },
  ) {
    setValues(next)
    setSubmitError(null)
    if (options?.clearErrors) {
      setErrors({})
      return
    }
    if (!changedField) {
      return
    }

    applyFieldError(next, changedField, true)
  }

  function handleCancelClick() {
    if (isRecipeFormDirty(values, baseline)) {
      cancelDialogRef.current?.showModal()
      return
    }
    void navigate({ to: '/recipes' })
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) {
      return
    }

    const nextErrors = validateRecipeForm(values)
    setErrors(nextErrors)
    setSubmitError(null)
    if (Object.keys(nextErrors).length > 0) {
      return
    }

    setIsSubmitting(true)
    try {
      const recipe = await createRecipe(toCreateRecipePayload(values))
      await navigate({ to: '/recipes/$id', params: { id: String(recipe.id) } })
    } catch (error) {
      if (error instanceof ApiValidationError) {
        setErrors(normalizeFieldErrors(error.fieldErrors))
        setSubmitError(error.message)
      } else if (error instanceof Error && error.message) {
        setSubmitError(error.message)
      } else {
        setSubmitError('保存に失敗しました。時間をおいて再度お試しください。')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <article>
      <div className="mb-6">
        <Button type="button" variant="secondary" onClick={handleCancelClick}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          キャンセル
        </Button>
      </div>

      <h2 className="mb-6 text-2xl font-bold">レシピを作成</h2>

      <form className="space-y-6" onSubmit={(event) => void handleSubmit(event)} noValidate>
        <section className="rounded-[var(--radius)] bg-surface p-5 shadow-[var(--shadow)]">
          <h3 className="mb-4 text-lg font-semibold">基本情報</h3>
          <div className="space-y-4">
            <Field label="タイトル" required error={errors.title}>
              <input
                id="title"
                name="title"
                type="text"
                value={values.title}
                onChange={(event) =>
                  updateValues({ ...values, title: event.target.value }, 'title')
                }
                onBlur={(event) =>
                  handleFieldBlur('title', { ...values, title: event.target.value })
                }
                aria-invalid={Boolean(errors.title)}
                aria-describedby={errors.title ? 'title-error' : undefined}
                className={inputClass(Boolean(errors.title))}
                placeholder="例: 醤油ラーメン"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="カテゴリ" required error={errors.category_id}>
                <select
                  id="category_id"
                  name="category_id"
                  aria-label="カテゴリ"
                  value={values.category_id}
                  onChange={(event) =>
                    updateValues(
                      { ...values, category_id: event.target.value },
                      'category_id',
                    )
                  }
                  onBlur={(event) =>
                    handleFieldBlur('category_id', {
                      ...values,
                      category_id: event.target.value,
                    })
                  }
                  aria-invalid={Boolean(errors.category_id)}
                  aria-describedby={
                    errors.category_id ? 'category_id-error' : undefined
                  }
                  className={inputClass(Boolean(errors.category_id))}
                >
                  <option value="">選択してください</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="人数" required error={errors.servings}>
                <input
                  id="servings"
                  name="servings"
                  type="number"
                  min={1}
                  value={values.servings}
                  onChange={(event) =>
                    updateValues(
                      {
                        ...values,
                        servings: normalizeNumericInput(event.target.value),
                      },
                      'servings',
                    )
                  }
                  onBlur={(event) =>
                    handleFieldBlur('servings', {
                      ...values,
                      servings: normalizeNumericInput(event.target.value),
                    })
                  }
                  aria-invalid={Boolean(errors.servings)}
                  aria-describedby={errors.servings ? 'servings-error' : undefined}
                  className={inputClass(Boolean(errors.servings))}
                />
              </Field>

              <Field label="調理時間（分）" required error={errors.cook_time_minutes}>
                <CookTimeStepper
                  id="cook_time_minutes"
                  name="cook_time_minutes"
                  minMinutes={10}
                  value={Number(values.cook_time_minutes) || 10}
                  onChange={(minutes) =>
                    updateValues(
                      {
                        ...values,
                        cook_time_minutes: String(minutes),
                      },
                      'cook_time_minutes',
                    )
                  }
                  aria-invalid={Boolean(errors.cook_time_minutes)}
                  aria-describedby={
                    errors.cook_time_minutes ? 'cook_time_minutes-error' : undefined
                  }
                />
              </Field>

              <Field label="難易度" required>
                <DifficultySelector
                  value={values.difficulty}
                  onChange={(difficulty) =>
                    updateValues({ ...values, difficulty }, 'difficulty')
                  }
                  error={errors.difficulty}
                />
              </Field>
            </div>

            <Field label="説明" error={errors.description} errorId="description-error">
              <textarea
                id="description"
                name="description"
                rows={3}
                value={values.description}
                onChange={(event) =>
                  updateValues(
                    { ...values, description: event.target.value },
                    'description',
                  )
                }
                onBlur={(event) =>
                  handleFieldBlur('description', {
                    ...values,
                    description: event.target.value,
                  })
                }
                aria-invalid={Boolean(errors.description)}
                aria-describedby={
                  errors.description ? 'description-error' : undefined
                }
                className={inputClass(Boolean(errors.description))}
                placeholder="レシピの説明（任意）…"
              />
            </Field>
          </div>
        </section>

        <section className="rounded-[var(--radius)] bg-surface p-5 shadow-[var(--shadow)]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold">材料 *</h3>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() =>
                updateValues(
                  {
                    ...values,
                    ingredients: [...values.ingredients, createEmptyIngredientRow()],
                  },
                  undefined,
                  { clearErrors: true },
                )
              }
            >
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
              <span aria-hidden="true" className="w-9" />
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
                    aria-label="材料名"
                    aria-required="true"
                    onChange={(event) => {
                      const next = [...values.ingredients]
                      next[index] = { ...ingredient, name: event.target.value }
                      updateValues(
                        { ...values, ingredients: next },
                        `ingredients.${index}.name`,
                      )
                    }}
                    onBlur={(event) => {
                      const next = [...values.ingredients]
                      next[index] = { ...ingredient, name: event.target.value }
                      handleFieldBlur(`ingredients.${index}.name`, {
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
                    placeholder="例: 中華麺"
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
                    aria-label="分量"
                    aria-required="true"
                    onChange={(event) => {
                      const next = [...values.ingredients]
                      next[index] = {
                        ...ingredient,
                        quantity: normalizeNumericInput(event.target.value),
                      }
                      updateValues(
                        { ...values, ingredients: next },
                        `ingredients.${index}.quantity`,
                      )
                    }}
                    onBlur={(event) => {
                      const next = [...values.ingredients]
                      next[index] = {
                        ...ingredient,
                        quantity: normalizeNumericInput(event.target.value),
                      }
                      handleFieldBlur(`ingredients.${index}.quantity`, {
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
                    aria-label="単位"
                    onChange={(unit) => {
                      const next = [...values.ingredients]
                      next[index] = { ...ingredient, unit }
                      updateValues(
                        { ...values, ingredients: next },
                        `ingredients.${index}.unit`,
                      )
                    }}
                    onBlur={() => {
                      handleFieldBlur(`ingredients.${index}.unit`, values)
                    }}
                    hasError={Boolean(errors[`ingredients.${index}.unit`])}
                    aria-describedby={
                      errors[`ingredients.${index}.unit`]
                        ? `ingredients-${index}-unit-error`
                        : undefined
                    }
                  />
                </Field>
                <div className="flex items-center justify-end self-center sm:justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label={`材料 ${index + 1} を削除`}
                    disabled={values.ingredients.length <= 1}
                    onClick={() =>
                      updateValues(
                        {
                          ...values,
                          ingredients: values.ingredients.filter(
                            (row) => row.key !== ingredient.key,
                          ),
                        },
                        undefined,
                        { clearErrors: true },
                      )
                    }
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[var(--radius)] bg-surface p-5 shadow-[var(--shadow)]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold">手順 *</h3>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() =>
                updateValues(
                  {
                    ...values,
                    steps: [...values.steps, createEmptyStepRow()],
                  },
                  undefined,
                  { clearErrors: true },
                )
              }
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              行を追加
            </Button>
          </div>
          {errors.steps ? (
            <p className="mb-3 text-sm text-destructive">{errors.steps}</p>
          ) : null}
          <div className="space-y-3">
            {values.steps.map((step, index) => (
              <div
                key={step.key}
                className="flex items-center gap-3 rounded-[var(--radius)] border border-border p-3"
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground"
                  aria-hidden="true"
                >
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <Field
                    error={errors[`steps.${index}.body`]}
                    errorId={`steps-${index}-body-error`}
                  >
                    <textarea
                      id={`steps-${index}-body`}
                      rows={2}
                      value={step.body}
                      aria-label={`手順 ${index + 1}`}
                      aria-required="true"
                      onChange={(event) => {
                        const next = [...values.steps]
                        next[index] = { ...step, body: event.target.value }
                        updateValues(
                          { ...values, steps: next },
                          `steps.${index}.body`,
                        )
                      }}
                      onBlur={(event) => {
                        const next = [...values.steps]
                        next[index] = { ...step, body: event.target.value }
                        handleFieldBlur(`steps.${index}.body`, {
                          ...values,
                          steps: next,
                        })
                      }}
                      aria-invalid={Boolean(errors[`steps.${index}.body`])}
                      aria-describedby={
                        errors[`steps.${index}.body`]
                          ? `steps-${index}-body-error`
                          : undefined
                      }
                      className={inputClass(Boolean(errors[`steps.${index}.body`]))}
                      placeholder="例: スープを作る"
                    />
                  </Field>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  aria-label={`手順 ${index + 1} を削除`}
                  disabled={values.steps.length <= 1}
                  onClick={() =>
                    updateValues(
                      {
                        ...values,
                        steps: values.steps.filter((row) => row.key !== step.key),
                      },
                      undefined,
                      { clearErrors: true },
                    )
                  }
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            ))}
          </div>
        </section>

        {submitError ? (
          <p className="text-sm text-destructive" role="alert">
            {submitError}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="secondary" onClick={handleCancelClick}>
            キャンセル
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            <Save className="h-4 w-4" aria-hidden="true" />
            {isSubmitting ? '保存中…' : '保存'}
          </Button>
        </div>
      </form>

      <dialog
        ref={cancelDialogRef}
        className="max-w-md rounded-[var(--radius)] border border-border bg-surface p-6 shadow-[var(--shadow)] backdrop:bg-black/40"
      >
        <h3 className="mb-2 text-lg font-semibold">入力内容を破棄しますか？</h3>
        <p className="mb-6 text-sm text-muted">
          保存していない変更は失われます。
        </p>
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => cancelDialogRef.current?.close()}
          >
            編集を続ける
          </Button>
          <Button type="button" asChild>
            <Link to="/recipes">一覧へ戻る</Link>
          </Button>
        </div>
      </dialog>
    </article>
  )
}

type FieldProps = {
  label?: string
  required?: boolean
  error?: string
  errorId?: string
  children: React.ReactNode
}

function Field({ label, required = false, error, errorId, children }: FieldProps) {
  const fieldId = label?.replace(/\s+/g, '-').toLowerCase() ?? 'field'
  const resolvedErrorId = errorId ?? `${fieldId}-error`
  const Wrapper = label ? 'label' : 'div'

  return (
    <Wrapper className="block text-sm">
      {label ? (
        <span className="mb-1 block font-medium">
          {label}
          {required ? ' *' : ''}
        </span>
      ) : null}
      {children}
      {error ? (
        <span id={resolvedErrorId} className="mt-1 block text-sm text-destructive">
          {error}
        </span>
      ) : null}
    </Wrapper>
  )
}

function inputClass(hasError: boolean) {
  return [
    'w-full rounded-[var(--radius)] border bg-background px-3 py-2 text-sm outline-none transition-colors',
    hasError
      ? 'border-destructive focus-visible:ring-[3px] focus-visible:ring-destructive/20'
      : 'border-input focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
  ].join(' ')
}
