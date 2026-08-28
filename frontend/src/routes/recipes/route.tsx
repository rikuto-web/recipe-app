/**
 * /recipes 配下の共通 layout。
 */
import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/recipes')({
  component: RecipesLayout,
})

function RecipesLayout() {
  return <Outlet />
}
