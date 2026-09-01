'use client'

import type { ButtonHTMLAttributes } from 'react'
import { useTooltip } from '@/hooks/useTooltip'

interface TooltipButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Contenu de l'infobulle tippy ; absent = pas d'infobulle. */
  tooltip?: string
}

/**
 * Bouton portant une infobulle tippy au lieu d'un `title` natif — instantanée,
 * là où le navigateur laisse planer une seconde de doute. Encapsuler le hook
 * permet aussi d'en poser dans les listes, où `useTooltip` est hors de portée.
 * L'infobulle ne remplace pas le nom accessible : penser à `aria-label`.
 */
export default function TooltipButton({ tooltip, children, ...props }: TooltipButtonProps) {
  const ref = useTooltip(tooltip)

  return (
    <button ref={ref} {...props}>
      {children}
    </button>
  )
}
