import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['lib/**/*.test.ts', 'components/**/*.test.ts', 'app/**/*.test.ts'],
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
