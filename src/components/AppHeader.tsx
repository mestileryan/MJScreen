'use client'

import { Disc3, Library, Music } from 'lucide-react'
import { publicUrl } from '@/lib/basePath'

export type AppPage = 'jukebox' | 'library'

const ITEMS: { page: AppPage; href: string; label: string; icon: typeof Disc3 }[] = [
  { page: 'jukebox', href: '/', label: 'Jukebox', icon: Disc3 },
  { page: 'library', href: '/trackslibrary/', label: 'Bibliothèque', icon: Library },
]

interface AppHeaderProps {
  current: AppPage
  className?: string
}

/**
 * Bandeau de site commun aux deux pages : le nom de l’application, puis les pages,
 * la courante soulignée d’un trait en dégradé qui s’étire au survol des autres.
 * Des liens en dur plutôt que `next/link` : chaque page est une entrée de l’export statique.
 */
export default function AppHeader({ current, className = '' }: AppHeaderProps) {
  return (
    // Collant : sur le jukebox, le lecteur latéral se cale juste dessous (voir CollapsibleSidebar).
    <header className={`sticky top-0 z-40 h-12 border-b border-white/10 bg-gray-900 ${className}`}>
      <div className="flex h-12 items-center gap-2 px-4 sm:gap-4 sm:px-6 md:px-8">
        <a href={publicUrl('/')} className="flex items-center gap-2" aria-label="MJScreen, accueil">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-purple-500 to-fuchsia-500 shadow-md shadow-purple-500/30">
            <Music className="h-4 w-4 text-white" />
          </span>
          <span className="hidden text-base font-bold tracking-tight text-white sm:inline">
            MJ<span className="text-purple-400">Screen</span>
          </span>
        </a>

        <nav aria-label="Pages" className="flex h-full items-stretch">
          {ITEMS.map(({ page, href, label, icon: Icon }) => {
            const active = page === current
            return (
              <a
                key={page}
                href={publicUrl(href)}
                aria-current={active ? 'page' : undefined}
                className={`group relative flex items-center gap-1.5 px-3 text-sm font-medium transition-colors ${
                  active ? 'text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Icon className={`h-4 w-4 transition-transform duration-300 ${active ? 'text-purple-400' : 'group-hover:-rotate-12'}`} />
                {label}
                <span
                  aria-hidden
                  className={`absolute inset-x-2 bottom-0 h-0.5 origin-left rounded-t-full bg-gradient-to-r from-purple-500 to-fuchsia-500 transition-transform duration-300 ease-out ${
                    active ? 'scale-x-100' : 'scale-x-0 opacity-70 group-hover:scale-x-100'
                  }`}
                />
              </a>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
