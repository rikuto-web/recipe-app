import { DifficultySelector } from '#/components/DifficultySelector'
import { CookTimeStepper } from '#/components/CookTimeStepper'
import { Field, inputClass } from '#/components/form/Field'
import type { Category } from '#/lib/api'
import {
  normalizeNumericInput,
  type RecipeFormErrors,
  type RecipeFormValues,
} from '#/lib/recipeFormValidation'

type RecipeParentFieldsProps = {
  values: RecipeFormValues
  errors: RecipeFormErrors
  categories: Category[]
  onUpdate: (next: RecipeFormValues, changedField?: string) => void
  onBlur: (field: string, next: RecipeFormValues) => void
  titlePlaceholder?: string
  descriptionPlaceholder?: string
}

export function RecipeParentFields({
  values,
  errors,
  categories,
  onUpdate,
  onBlur,
  titlePlaceholder,
  descriptionPlaceholder,
}: RecipeParentFieldsProps) {
  return (
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
              onUpdate({ ...values, title: event.target.value }, 'title')
            }
            onBlur={(event) =>
              onBlur('title', { ...values, title: event.target.value })
            }
            aria-invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? 'title-error' : undefined}
            className={inputClass(Boolean(errors.title))}
            placeholder={titlePlaceholder}
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
                onUpdate(
                  { ...values, category_id: event.target.value },
                  'category_id',
                )
              }
              onBlur={(event) =>
                onBlur('category_id', {
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
                onUpdate(
                  {
                    ...values,
                    servings: normalizeNumericInput(event.target.value),
                  },
                  'servings',
                )
              }
              onBlur={(event) =>
                onBlur('servings', {
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
                onUpdate(
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
                onUpdate({ ...values, difficulty }, 'difficulty')
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
              onUpdate(
                { ...values, description: event.target.value },
                'description',
              )
            }
            onBlur={(event) =>
              onBlur('description', {
                ...values,
                description: event.target.value,
              })
            }
            aria-invalid={Boolean(errors.description)}
            aria-describedby={
              errors.description ? 'description-error' : undefined
            }
            className={inputClass(Boolean(errors.description))}
            placeholder={descriptionPlaceholder}
          />
        </Field>
      </div>
    </section>
  )
}
