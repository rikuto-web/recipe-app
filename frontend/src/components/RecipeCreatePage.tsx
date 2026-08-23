/**
 * SC-03 レシピ新規作成（docs/04-screen-transitions.md, docs/08-ui-design.md §4）。
 */
import { useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Save } from 'lucide-react'

import { DiscardChangesDialog } from '#/components/recipe-form/DiscardChangesDialog'
import { IngredientRows } from '#/components/recipe-form/IngredientRows'
import { RecipeParentFields } from '#/components/recipe-form/RecipeParentFields'
import { StepRows } from '#/components/recipe-form/StepRows'
import { Button } from '#/components/ui/button'
import {
  ApiValidationError,
  createRecipe,
  type Category,
} from '#/lib/api'
import {
  createInitialFormValues,
  isRecipeFormDirty,
  normalizeFieldErrors,
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

  function handleDeleteIngredient(index: number) {
    const row = values.ingredients[index]
    if (!row || values.ingredients.length <= 1) {
      return
    }
    updateValues(
      {
        ...values,
        ingredients: values.ingredients.filter((item) => item.key !== row.key),
      },
      undefined,
      { clearErrors: true },
    )
  }

  function handleDeleteStep(index: number) {
    const row = values.steps[index]
    if (!row || values.steps.length <= 1) {
      return
    }
    updateValues(
      {
        ...values,
        steps: values.steps.filter((item) => item.key !== row.key),
      },
      undefined,
      { clearErrors: true },
    )
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
        <RecipeParentFields
          values={values}
          errors={errors}
          categories={categories}
          onUpdate={updateValues}
          onBlur={handleFieldBlur}
          titlePlaceholder="例: 醤油ラーメン"
          descriptionPlaceholder="レシピの説明（任意）…"
        />

        <IngredientRows
          values={values}
          errors={errors}
          onUpdate={updateValues}
          onBlur={handleFieldBlur}
          onDelete={handleDeleteIngredient}
          variant="create"
        />

        <StepRows
          values={values}
          errors={errors}
          onUpdate={updateValues}
          onBlur={handleFieldBlur}
          onDelete={handleDeleteStep}
          variant="create"
        />

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

      <DiscardChangesDialog
        dialogRef={cancelDialogRef}
        confirmTo="/recipes"
        confirmLabel="一覧へ戻る"
      />
    </article>
  )
}
