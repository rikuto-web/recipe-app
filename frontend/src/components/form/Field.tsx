type FieldProps = {
  label?: string
  required?: boolean
  error?: string
  errorId?: string
  children: React.ReactNode
}

export function Field({
  label,
  required = false,
  error,
  errorId,
  children,
}: FieldProps) {
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

export function inputClass(hasError: boolean) {
  return [
    'w-full rounded-[var(--radius)] border bg-background px-3 py-2 text-sm outline-none transition-colors',
    hasError
      ? 'border-destructive focus-visible:ring-[3px] focus-visible:ring-destructive/20'
      : 'border-input focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
  ].join(' ')
}
