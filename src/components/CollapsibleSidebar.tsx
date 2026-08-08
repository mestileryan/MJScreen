'use client'

import { ChevronLeft, ChevronRight, Settings } from 'lucide-react'
import type { ReactNode } from 'react'

interface CollapsibleSidebarProps {
  collapsed: boolean
  onCollapsedChange: (collapsed: boolean) => void
  onOpenSettings: () => void
  children: ReactNode
}

export default function CollapsibleSidebar({
  collapsed,
  onCollapsedChange,
  onOpenSettings,
  children,
}: CollapsibleSidebarProps) {
  return (
    /* Deux dispositions. Sur téléphone : un panneau fixé en bas de l'écran, replié en
       simple barre. À partir de `md` : la colonne latérale collante d'origine, où
       `self-start` empêche l'étirement sur toute la hauteur de la grille — sans quoi
       elle n'aurait aucune marge de manœuvre pour coller. */
    <div
      className={`fixed inset-x-0 bottom-0 z-30 border-t border-gray-700 bg-gray-800
        md:sticky md:inset-x-auto md:bottom-auto md:top-0 md:z-auto md:h-screen md:self-start
        md:border-l md:border-t-0 ${
          collapsed
            ? 'flex h-12 items-center justify-end px-3 md:h-screen md:w-6 md:justify-center md:bg-transparent md:px-0'
            : 'flex max-h-[75vh] flex-col md:max-h-none md:w-96 md:justify-start'
        }`}
    >
      <button
        onClick={() => onCollapsedChange(!collapsed)}
        className="absolute right-3 top-2 rounded-full border border-gray-600 bg-gray-800 p-1 text-purple-300
          shadow-md transition-colors hover:bg-gray-700 hover:text-purple-400 md:-left-3 md:right-auto"
      >
        {collapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>

      {/* Bouton en forme de roue crantée : à côté du chevron sur téléphone,
          dessous sur grand écran. */}
      <button
        onClick={onOpenSettings}
        className="absolute right-14 top-2 rounded-full border border-gray-600 bg-gray-800 p-1 text-purple-300
          shadow-md transition-colors hover:bg-gray-700 hover:text-purple-400 md:-left-3 md:right-auto md:top-12"
      >
        <Settings className="w-4 h-4" />
      </button>

      {/* Le défilement est porté par ce conteneur intérieur : le poser sur la racine
          rognerait les deux boutons, qui débordent à gauche sur grand écran.
          `pt-12` dégage sur téléphone la place qu'ils occupent en haut du panneau. */}
      {!collapsed && (
        <div className="min-h-0 flex-1 overflow-y-auto p-4 pt-12 md:p-6 md:pt-6">{children}</div>
      )}
    </div>
  )
}
