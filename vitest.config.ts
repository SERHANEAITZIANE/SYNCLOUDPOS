import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    exclude: ['**/node_modules/**', '**/.claude/**', '**/syncloud-gerant/**', '**/syncloud-tournee/**'],
    setupFiles: ['./src/__tests__/setup.ts'],
    env: {
      DATABASE_URL: process.env.DATABASE_URL || 'postgresql://test_user:test_secret@localhost:5432/syncloudpos_test?schema=public'
    },
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
})
