import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'

// Tests unitaires de la logique pure (schémas, stockage, bibliothèque de pistes),
// exécutés sous Node : les API du navigateur sont imitées (fake-indexeddb, faux handles).
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
