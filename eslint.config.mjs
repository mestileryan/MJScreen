import coreWebVitals from 'eslint-config-next/core-web-vitals'
import typescript from 'eslint-config-next/typescript'

const config = [
  {
    ignores: [
      '**/.next/**',
      '**/out/**',
      '**/dist/**',
      '**/coverage/**',
      'mjscreen.client/**',
    ],
  },
  ...coreWebVitals,
  ...typescript,
  {
    rules: {
      // Les vignettes et aperçus s'appuient sur des object URLs issus d'IndexedDB,
      // que `next/image` ne sait pas traiter (et l'export statique n'optimise rien).
      '@next/next/no-img-element': 'off',
    },
  },
]

export default config
