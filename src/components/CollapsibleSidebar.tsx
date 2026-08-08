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
    // `self-start` empêche l'étirement sur toute la hauteur de la grille : sans cela
    // le panneau n'aurait aucune marge de manœuvre pour coller. `sticky` sert aussi de
    // référence de positionnement aux deux boutons en débord à gauche.
    <div
      className={`sticky top-0 self-start h-screen border-l border-gray-700 ${
        collapsed
          ? 'w-6 flex items-center justify-center'
          : 'w-96 bg-gray-800 flex flex-col justify-start'
      }`}
    >
      <button
        onClick={() => onCollapsedChange(!collapsed)}
        className="absolute -left-3 top-2 rounded-full p-1 text-purple-300 hover:text-purple-400 hover:bg-gray-700 transition-colors bg-gray-800 border border-gray-600 shadow-md"
      >
        {collapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>

      {/* Bouton en forme de roue crantée */}
      <button
        onClick={onOpenSettings}
        className="absolute -left-3 top-12 rounded-full p-1 text-purple-300 hover:text-purple-400 hover:bg-gray-700 transition-colors bg-gray-800 border border-gray-600 shadow-md"
      >
        <Settings className="w-4 h-4" />
      </button>

      {/* Le défilement est porté par ce conteneur intérieur : le poser sur la racine
          rognerait les deux boutons, qui débordent à gauche. */}
      {!collapsed && <div className="flex-1 min-h-0 overflow-y-auto p-6">{children}</div>}
    </div>
  )
}
