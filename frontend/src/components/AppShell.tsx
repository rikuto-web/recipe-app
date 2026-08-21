/**
 * 全画面共通レイアウト（docs/08-ui-design.md §4 SC-01 ヘッダー）。
 * - ロゴ: Lucide `ChefHat`（絵文字・★テキストは使わない）
 * - 最大幅 960px、Pattern A のウォーム配色
 */
import { ChefHat, Plus } from 'lucide-react'

import { Button } from '#/components/ui/button'

type AppShellProps = {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-bg text-text">
      <div className="mx-auto max-w-[960px] px-5 pb-12 pt-4">
        <header className="mb-6 flex items-center justify-between border-b-2 border-primary-light pb-6">
          <div className="flex items-center gap-2">
            <ChefHat
              className="h-7 w-7 text-primary"
              aria-hidden="true"
            />
            <h1 className="text-xl font-bold">
              <span className="text-primary">レシピ</span>管理
            </h1>
          </div>
          {/* VS-03 で `/recipes/new` へ接続する */}
          <Button type="button" disabled aria-label="新規作成（準備中）">
            <Plus className="h-4 w-4" aria-hidden="true" />
            新規作成
          </Button>
        </header>
        <main>{children}</main>
      </div>
    </div>
  )
}
