'use client'

import { useCallback, useSyncExternalStore } from 'react'

/**
 * Etat d'une media query, pour les rares cas où un point de rupture CSS ne suffit
 * pas — typiquement une largeur posée en style inline, qu'aucune classe ne peut
 * écraser.
 *
 * Le HTML est pré-rendu côté Node, sans fenêtre : l'instantané serveur répond
 * toujours `false`, et la valeur réelle prend le relais après hydratation sans
 * provoquer d'écart.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    [query],
  )

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/** Vrai en dessous du point de rupture `md` de Tailwind (768 px). */
export function useIsNarrow(): boolean {
  return useMediaQuery('(max-width: 767px)')
}
