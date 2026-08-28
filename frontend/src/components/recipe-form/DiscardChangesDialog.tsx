import { Link } from '@tanstack/react-router'

import { Button } from '#/components/ui/button'

type DiscardChangesDialogProps = {
  dialogRef: React.RefObject<HTMLDialogElement | null>
  confirmTo: string
  confirmParams?: { id: string }
  confirmLabel: string
}

export function DiscardChangesDialog({
  dialogRef,
  confirmTo,
  confirmParams,
  confirmLabel,
}: DiscardChangesDialogProps) {
  return (
    <dialog
      ref={dialogRef}
      className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius)] border border-border bg-surface p-6 shadow-[var(--shadow)] backdrop:bg-black/40"
    >
      <h3 className="mb-2 text-lg font-semibold">入力内容を破棄しますか？</h3>
      <p className="mb-6 text-sm text-muted">保存していない変更は失われます。</p>
      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={() => dialogRef.current?.close()}
        >
          編集を続ける
        </Button>
        <Button type="button" asChild>
          {confirmParams ? (
            <Link to={confirmTo} params={confirmParams}>
              {confirmLabel}
            </Link>
          ) : (
            <Link to={confirmTo}>{confirmLabel}</Link>
          )}
        </Button>
      </div>
    </dialog>
  )
}
