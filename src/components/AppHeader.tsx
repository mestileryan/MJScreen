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
 * Bandeau de site commun aux deux pages : le nom de l’application, puis les pages.
 * La page courante est une languette chanfreinée posée sur la ligne du bandeau,
 * comme l’intercalaire d’un classeur. Des liens en dur plutôt que `next/link` :
 * chaque page est une entrée de l’export statique.
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

        <nav aria-label="Pages" className="flex h-12 items-end">
          {ITEMS.map(({ page, href, label, icon: Icon }) =>
            page === current ? (
              <a
                key={page}
                href={href === '/' ? publicUrl('/') : publicUrl(href)}
                aria-current="page"
                // Du violet en haut au gris de la page en bas, par-dessus la bordure (`-mb-px`) :
                // la languette se fond dans le contenu, comme un intercalaire tiré de la page.
                className="relative -mb-px flex h-10 items-center gap-1.5 bg-gradient-to-b from-purple-600 via-purple-800 to-gray-900 px-5 text-sm font-medium text-on-accent"
                style={{ clipPath: 'polygon(0 100%, 10px 0, calc(100% - 10px) 0, 100% 100%)' }}
              >
                <Icon className="h-4 w-4" />
                {label}
              </a>
            ) : (
              <a
                key={page}
                href={publicUrl(href)}
                className="group relative flex h-12 items-center gap-1.5 px-3 text-sm font-medium text-gray-400 transition-colors hover:text-white"
              >
                <Icon className="h-4 w-4 transition-transform duration-300 group-hover:-rotate-12" />
                {label}
              </a>
            ),
          )}
        </nav>
      </div>
    </header>
  )
}
