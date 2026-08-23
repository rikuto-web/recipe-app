/**
 * SC-04 レシピ編集（docs/04-screen-transitions.md, docs/08-ui-design.md §4）。
 * 画面上の変更はフッターの保存 1 つで送信する（親 PUT + 変更行の POST / PATCH / DELETE）。
 */
import { useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Pencil, Save } from 'lucide-react'

import { DiscardChangesDialog } from '#/components/recipe-form/DiscardChangesDialog'
import { IngredientRows } from '#/components/recipe-form/IngredientRows'
import { RecipeParentFields } from '#/components/recipe-form/RecipeParentFields'
import { StepRows } from '#/components/recipe-form/StepRows'
import { Button } from '#/components/ui/button'
import {
  ApiValidationError,
  updateRecipe,
  type Category,
  type RecipeDetail,
} from '#/lib/api'
import {
  isRecipeFormDirty,
  normalizeFieldErrors,
  recipeToFormValues,
  toUpdateRecipePayload,
  validateRecipeForm,
  validateRecipeFormField,
  type RecipeFormErrors,
  type RecipeFormValues,
} from '#/lib/recipeFormValidation'
import { persistRecipeEditRows } from '#/lib/recipeEditPersistence'

type RecipeEditPageProps = {
  recipe: RecipeDetail
  categories: Category[]
}

export function RecipeEditPage({ recipe, categories }: RecipeEditPageProps) {
  const navigate = useNavigate()
  const cancelDialogRef = useRef<HTMLDialogElement>(null)
  const [baseline, setBaseline] = useState(() => recipeToFormValues(recipe))
  const [values, setValues] = useState<RecipeFormValues>(() =>
    recipeToFormValues(recipe),
  )
  const [deletedIngredientIds, setDeletedIngredientIds] = useState<number[]>([])
  const [deletedStepIds, setDeletedStepIds] = useState<number[]>([])
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

  function updateValues(next: RecipeFormValues, changedField?: string) {
    setValues(next)
    setSubmitError(null)
    if (changedField) {
      applyFieldError(next, changedField, true)
    }
  }

  function handleCancelClick() {
    if (isRecipeFormDirty(values, baseline)) {
      cancelDialogRef.current?.showModal()
      return
    }
    void navigate({ to: '/recipes/$id', params: { id: String(recipe.id) } })
  }

  function handleDeleteIngredient(index: number) {
    const row = values.ingredients[index]
    if (!row || values.ingredients.length <= 1) {
      return
    }
    if (row.id != null) {
      setDeletedIngredientIds((current) => [...current, row.id!])
    }
    updateValues({
      ...values,
      ingredients: values.ingredients.filter((item) => item.key !== row.key),
    })
  }

  function handleDeleteStep(index: number) {
    const row = values.steps[index]
    if (!row || values.steps.length <= 1) {
      return
    }
    if (row.id != null) {
      setDeletedStepIds((current) => [...current, row.id!])
    }
    updateValues({
      ...values,
      steps: values.steps.filter((item) => item.key !== row.key),
    })
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
    let progress = {
      values,
      baseline,
      deletedIngredientIds,
      deletedStepIds,
    }

    const applyProgress = (next: typeof progress) => {
      progress = next
      setValues(next.values)
      setBaseline(next.baseline)
      setDeletedIngredientIds(next.deletedIngredientIds)
      setDeletedStepIds(next.deletedStepIds)
    }

    try {
      progress = await persistRecipeEditRows(recipe.id, progress, applyProgress)
      applyProgress(progress)
      const updated = await updateRecipe(recipe.id, toUpdateRecipePayload(progress.values))
      await navigate({ to: '/recipes/$id', params: { id: String(updated.id) } })
    } catch (error) {
      applyProgress(progress)
      handleRequestError(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleRequestError(error: unknown) {
    if (error instanceof ApiValidationError) {
      setErrors((current) => ({
        ...current,
        ...normalizeFieldErrors(error.fieldErrors),
      }))
      setSubmitError(error.message)
    } else if (error instanceof Error && error.message) {
      setSubmitError(error.message)
    } else {
      setSubmitError('保存に失敗しました。時間をおいて再度お試しください。')
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

      <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold">
        <Pencil className="h-6 w-6 text-primary" aria-hidden="true" />
        レシピを編集
      </h2>

      <form
        className="space-y-6"
        onSubmit={(event) => void handleSubmit(event)}
        noValidate
      >
        <RecipeParentFields
          values={values}
          errors={errors}
          categories={categories}
          onUpdate={updateValues}
          onBlur={handleFieldBlur}
        />

        <IngredientRows
          values={values}
          errors={errors}
          onUpdate={updateValues}
          onBlur={handleFieldBlur}
          onDelete={handleDeleteIngredient}
          variant="edit"
        />

        <StepRows
          values={values}
          errors={errors}
          onUpdate={updateValues}
          onBlur={handleFieldBlur}
          onDelete={handleDeleteStep}
          variant="edit"
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
        confirmTo="/recipes/$id"
        confirmParams={{ id: String(recipe.id) }}
        confirmLabel="詳細へ戻る"
      />
    </article>
  )
}
