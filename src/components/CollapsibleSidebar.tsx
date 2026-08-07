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
    <div
      className={`relative border-l border-gray-700 ${
        collapsed
          ? 'w-6 flex items-center justify-center'
          : 'w-96 bg-gray-800 p-6 flex flex-col justify-start'
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

      {!collapsed && children}
    </div>
  )
}
