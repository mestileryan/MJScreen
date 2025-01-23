import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import svgLoader from 'vite-svg-loader'

export default defineConfig({
  plugins: [
    vue(),
    svgLoader()
  ],
  // Ajuste la valeur de `base` selon ton dépôt / URL de déploiement.
  base: '/MJScreen/',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  css: {
    // Si tu utilises PostCSS, assure-toi que ce chemin est correct.
    postcss: './postcss.config.js'
  }
})
