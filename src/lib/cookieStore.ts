import { Cookies } from '@/models/Cookies'

/**
 * Les cookies sont une source de vérité *externe* à React : les exposer via un store
 * abonnable permet de les lire avec `useSyncExternalStore`, qui gère proprement la
 * différence entre le HTML pré-rendu (aucun cookie) et le premier rendu client.
 */
const listeners = new Set<() => void>()

export function subscribeCookies(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function readCookie(name: string): string | null {
  return Cookies.get(name)
}

export function writeCookie(name: string, value: string): void {
  Cookies.set(name, value)
  listeners.forEach(listener => listener())
}
