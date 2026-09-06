'use client'

import { Pencil, Play } from 'lucide-react'
import TooltipButton from './TooltipButton'
import { useAppMode } from '@/hooks/useAppMode'

/** Bascule Planification / Jeu, sur le modèle de la bascule liste / grille. */
export default function AppModeToggle() {
  const { gameMode, setGameMode } = useAppMode()

  const segment = (active: boolean) =>
    `flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors ${
      active ? 'bg-purple-600 text-on-accent' : 'text-gray-200 hover:bg-gray-600'
    }`

  return (
    <div className="inline-flex items-center rounded-full bg-gray-700 p-1">
      <TooltipButton
        className={`${segment(!gameMode)} rounded-l-full`}
        onClick={() => setGameMode(false)}
        aria-pressed={!gameMode}
        tooltip="Planification : organiser la bibliothèque, régler les pistes, importer"
      >
        <Pencil className="h-4 w-4" />
        <span className="hidden sm:inline">Plan</span>
      </TooltipButton>
      <TooltipButton
        className={`${segment(gameMode)} rounded-r-full`}
        onClick={() => setGameMode(true)}
        aria-pressed={gameMode}
        tooltip="Jeu : lancer et arrêter les pistes, rien d’autre — l’interface se dépouille"
      >
        <Play className="h-4 w-4" />
        <span className="hidden sm:inline">Jeu</span>
      </TooltipButton>
    </div>
  )
}
