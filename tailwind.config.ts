import type { Config } from 'tailwindcss'

/** Couleur pilotée par une variable CSS, compatible avec les opacités (`/20`). */
const variable = (name: string) => `rgb(var(--${name}) / <alpha-value>)`

export default {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      // Les composants sont écrits « dark-first » avec les classes Tailwind
      // habituelles. Plutôt que de doubler chaque classe d'une variante, la
      // palette elle-même passe par des variables CSS : `.light` sur <html> les
      // redéfinit (voir globals.css) et tout le rendu suit.
      colors: {
        white: variable('white'),
        black: variable('black'),
        gray: {
          50: variable('gray-50'),
          100: variable('gray-100'),
          200: variable('gray-200'),
          300: variable('gray-300'),
          400: variable('gray-400'),
          500: variable('gray-500'),
          600: variable('gray-600'),
          700: variable('gray-700'),
          800: variable('gray-800'),
          900: variable('gray-900'),
          950: variable('gray-950'),
        },
        // Les teintes claires des accents (texte, icônes) foncent sur fond
        // clair ; le violet des boutons pleins (600, et 500 au survol)
        // s'éclaircit au contraire d'un cran. Les rouges de danger restent.
        purple: {
          300: variable('purple-300'),
          400: variable('purple-400'),
          500: variable('purple-500'),
          600: variable('purple-600'),
        },
        green: { 400: variable('green-400') },
        red: { 300: variable('red-300'), 400: variable('red-400') },
        blue: { 400: variable('blue-400') },
        /** Fond hors gabarit (gouttières autour de l'application). */
        gutter: variable('gutter'),
        /** Tuiles du soundboard : découplées de gray-600, qui sert aussi au survol
            des rangées — en clair l'une doit foncer quand l'autre s'éclaircit. */
        tile: { DEFAULT: variable('tile'), hover: variable('tile-hover') },
        /** Texte posé sur un fond coloré (boutons) : blanc dans les deux thèmes. */
        'on-accent': '#ffffff',
      },
    },
  },
  plugins: [],
} satisfies Config
