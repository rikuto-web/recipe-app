import { Plus, Trash2 } from 'lucide-react'

import { Field, inputClass } from '#/components/form/Field'
import { Button } from '#/components/ui/button'
import {
  createEmptyStepRow,
  type RecipeFormErrors,
  type RecipeFormValues,
  type StepFormRow,
} from '#/lib/recipeFormValidation'

type StepRowsProps = {
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

export function StepRows({
  values,
  errors,
  onUpdate,
  onBlur,
  onDelete,
  variant = 'create',
}: StepRowsProps) {
  function handleAddRow() {
    onUpdate(
      {
        ...values,
        steps: [...values.steps, createEmptyStepRow()],
      },
      undefined,
      variant === 'create' ? { clearErrors: true } : undefined,
    )
  }

  function updateStep(index: number, step: StepFormRow, changedField?: string) {
    const next = [...values.steps]
    next[index] = step
    onUpdate({ ...values, steps: next }, changedField)
  }

  return (
    <section className="rounded-[var(--radius)] bg-surface p-5 shadow-[var(--shadow)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">手順 *</h3>
        <Button type="button" variant="secondary" size="sm" onClick={handleAddRow}>
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
                    updateStep(
                      index,
                      { ...step, body: event.target.value },
                      `steps.${index}.body`,
                    )
                  }}
                  onBlur={(event) => {
                    const next = [...values.steps]
                    next[index] = { ...step, body: event.target.value }
                    onBlur(`steps.${index}.body`, {
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
                  placeholder={variant === 'create' ? '例: スープを作る' : undefined}
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
              onClick={() => onDelete(index)}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        ))}
      </div>
    </section>
  )
}
