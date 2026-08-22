/** Vitest + Testing Library の共通セットアップ。 */
import { createElement, type ReactNode } from 'react'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()

  function MockLink({
    to,
    params,
    children,
    className,
    ...rest
  }: {
    to: string
    params?: { id?: string }
    children?: ReactNode
    className?: string
  }) {
    const href =
      typeof to === 'string' && to.includes('$id') && params?.id
        ? to.replace('$id', params.id)
        : typeof to === 'string'
          ? to
          : '#'

    return createElement('a', { href, className, ...rest }, children)
  }

  return {
    ...actual,
    Link: MockLink,
  }
})

afterEach(() => {
  cleanup()
})
