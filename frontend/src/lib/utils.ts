import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** shadcn/ui コンポーネント向けの Tailwind クラス結合ユーティリティ。 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
