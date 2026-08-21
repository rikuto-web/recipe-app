/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// TanStack Start + Tailwind v4。開発サーバーは docs/07-architecture.md どおり :5173。
const config = defineConfig({
  resolve: { tsconfigPaths: true },
  server: {
    port: 5173,
  },
  plugins: [tailwindcss(), tanstackStart(), viteReact()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
})

export default config
