'use client'

import { useCallback, useSyncExternalStore } from 'react'
import { sameTag } from '@/lib/trackSearch'

const KEY = 'mjscreen.tracksLibrary.recentTags'
export const RECENT_TAGS_COUNT = 5
const EMPTY: string[] = []

// Petit magasin externe : `useSyncExternalStore` lit la même référence tant que rien
// n’a changé, et le pré-rendu voit une liste vide.
const listeners = new Set<() => void>()
let cache: string[] | null = null

function read(): string[] {
  if (cache) return cache
  try {
    const stored = JSON.parse(window.localStorage.getItem(KEY) ?? '[]')
    cache = Array.isArray(stored) ? stored.filter((t): t is string => typeof t === 'string') : EMPTY
  } catch {
    // Valeur illisible ou stockage indisponible : on repart de rien.
    cache = EMPTY
  }
  return cache
}

function write(next: string[]) {
  cache = next
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Navigation privée : la liste ne survivra pas à la page, sans gravité.
  }
  listeners.forEach(listener => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/**
 * Les dernières étiquettes qu’on a manipulées (posées sur une piste, filtrées,
 * cherchées), pour les proposer en premier. C’est une préférence du poste, pas
 * de la bibliothèque : elle vit dans le navigateur.
 */
export function useRecentTags() {
  const recent = useSyncExternalStore(subscribe, read, () => EMPTY)

  const touch = useCallback((...tags: string[]) => {
    let next = read()
    for (const tag of tags) next = [tag, ...next.filter(t => !sameTag(t, tag))].slice(0, RECENT_TAGS_COUNT)
    if (next !== read()) write(next)
  }, [])

  return { recent, touch }
}
