import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

/** TanStack Router インスタンス。`src/routes/` のファイルベースルートから生成される。 */
export function getRouter() {
  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    // Micro VM では intent preload が API 未復旧時にエラー状態を先に作りやすい
    defaultPreload: false,
    defaultPreloadStaleTime: 30_000,
  })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
