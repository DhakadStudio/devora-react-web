import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    globals: false,
    pool: 'threads',
    poolOptions: { threads: { singleThread: true } },
    testTimeout: 20_000
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') }
  }
})
