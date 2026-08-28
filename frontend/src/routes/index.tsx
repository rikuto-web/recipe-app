/**
 * 初回アクセスは一覧 `/recipes` へ送る（docs/04-screen-transitions.md）。
 */
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    throw redirect({ to: '/recipes' })
  },
})
