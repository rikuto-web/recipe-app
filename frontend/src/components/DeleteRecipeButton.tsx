/**
 * レシピ削除ボタン + 確認 Dialog（UC-07, docs/08-ui-design.md §4）。
 * 成功時および 404（削除済み）時に onDeleted を呼ぶ。
 */
import { useRef, useState } from 'react'
import { Trash2 } from 'lucide-react'

import { Button } from '#/components/ui/button'
import { ApiError, deleteRecipe } from '#/lib/api'

type DeleteRecipeButtonProps = {
  recipeId: number
  recipeTitle: string
  onDeleted: () => void
  className?: string
}

export function DeleteRecipeButton({
  recipeId,
  recipeTitle,
  onDeleted,
  className,
}: DeleteRecipeButtonProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function openDialog() {
    setError(null)
    dialogRef.current?.showModal()
  }

  async function handleConfirm() {
    setIsDeleting(true)
    setError(null)

    try {
      await deleteRecipe(recipeId)
      dialogRef.current?.close()
      onDeleted()
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        dialogRef.current?.close()
        onDeleted()
        return
      }

      setError(
        err instanceof Error ? err.message : '削除に失敗しました',
      )
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="destructive"
        className={className}
        aria-label={`${recipeTitle} を削除`}
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          openDialog()
        }}
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        削除
      </Button>

      <dialog
        ref={dialogRef}
        className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius)] border border-border bg-surface p-6 shadow-[var(--shadow)] backdrop:bg-black/40"
        onClick={(event) => {
          if (event.target === dialogRef.current) {
            dialogRef.current.close()
          }
        }}
      >
        <h3 className="mb-4 text-lg font-semibold">レシピを削除しますか？</h3>
        <div className="mb-6 space-y-3 text-sm leading-relaxed text-muted">
          <div className="rounded-[var(--radius)] border border-border bg-background px-4 py-3">
            <p className="mb-1 text-xs font-medium text-muted">削除対象</p>
            <p className="break-keep font-medium text-text">{recipeTitle}</p>
          </div>
          <p className="break-keep text-pretty">
            材料・手順も含めて完全に削除されます。
            <br />
            この操作は取り消せません。
          </p>
        </div>
        {error ? (
          <p className="mb-4 text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            disabled={isDeleting}
            onClick={() => dialogRef.current?.close()}
          >
            キャンセル
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={isDeleting}
            onClick={() => void handleConfirm()}
          >
            {isDeleting ? '削除中…' : '削除する'}
          </Button>
        </div>
      </dialog>
    </>
  )
}
