'use client'

import { Grid3x3, List } from 'lucide-react'

interface ViewModePlayerToggleProps {
  /** Mode d’affichage courant (true => liste, false => grille) */
  isListView: boolean
  onChange: (isListView: boolean) => void
}

export default function ViewModePlayerToggle({
  isListView,
  onChange,
}: ViewModePlayerToggleProps) {
  return (
    <div className="inline-flex items-center bg-gray-700 p-1 rounded-full">
      {/* Bouton "Liste" */}
      <button
        className={`px-3 py-2 rounded-l-full flex items-center justify-center transition-colors ${
          isListView ? 'bg-purple-600 text-white' : 'text-gray-200 hover:bg-gray-600'
        }`}
        onClick={() => onChange(true)}
      >
        <List className="w-5 h-5" />
      </button>

      {/* Bouton "Grille" */}
      <button
        className={`px-3 py-2 rounded-r-full flex items-center justify-center transition-colors ${
          !isListView ? 'bg-purple-600 text-white' : 'text-gray-200 hover:bg-gray-600'
        }`}
        onClick={() => onChange(false)}
      >
        <Grid3x3 className="w-5 h-5" />
      </button>
    </div>
  )
}
