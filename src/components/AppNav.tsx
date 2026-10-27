'use client'

import { Disc3, Library } from 'lucide-react'
import { publicUrl } from '@/lib/basePath'

export type AppPage = 'jukebox' | 'library'

const ITEMS: { page: AppPage; href: string; label: string; icon: typeof Disc3 }[] = [
  { page: 'jukebox', href: '/', label: 'Jukebox', icon: Disc3 },
  { page: 'library', href: '/trackslibrary/', label: 'Bibliothèque', icon: Library },
]

interface AppNavProps {
  current: AppPage
  /** Icônes seules jusqu’aux grands écrans : l’en-tête du jukebox est déjà chargé. */
  compact?: boolean
}

/**
 * Menu commun aux deux pages : une pilule dont la surbrillance glisse sous la page
 * courante. Les onglets ont la même largeur, c’est ce qui permet à la surbrillance
 * de se placer par simple fraction. Des liens en dur plutôt que `next/link` :
 * chaque page est une entrée de l’export statique.
 */
export default function AppNav({ current, compact = false }: AppNavProps) {
  const index = ITEMS.findIndex(item => item.page === current)
  const labelClass = compact ? 'hidden lg:inline' : 'hidden sm:inline'

  return (
    <nav
      aria-label="Pages"
      className="relative grid shrink-0 auto-cols-fr grid-flow-col rounded-full bg-gray-700/70 p-1 ring-1 ring-white/10 backdrop-blur"
    >
      {/* La surbrillance : un seul élément qui glisse, plutôt qu’un fond par onglet. */}
      <span
        aria-hidden
        className="absolute inset-y-1 rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-500 shadow-lg shadow-purple-500/40 transition-[left] duration-300 ease-out"
        style={{ width: `calc((100% - 0.5rem) / ${ITEMS.length})`, left: `calc(0.25rem + (100% - 0.5rem) * ${index} / ${ITEMS.length})` }}
      />
      {ITEMS.map(({ page, href, label, icon: Icon }) => {
        const active = page === current
        return (
          <a
            key={page}
            href={publicUrl(href)}
            title={label}
            aria-current={active ? 'page' : undefined}
            className={`group relative z-10 flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              active ? 'text-on-accent' : 'text-gray-300 hover:text-white'
            }`}
          >
            <Icon className={`h-4 w-4 transition-transform duration-300 ${active ? '' : 'group-hover:rotate-12 group-hover:scale-110'}`} />
            <span className={labelClass}>{label}</span>
          </a>
        )
      })}
    </nav>
  )
}
