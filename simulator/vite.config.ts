import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Relative base so the built bundle works from any sub-path (e.g. GitHub Pages).
export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
