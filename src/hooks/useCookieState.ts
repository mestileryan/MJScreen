'use client'

import { useCallback, useSyncExternalStore } from 'react'
import { readCookie, subscribeCookies, writeCookie } from '@/lib/cookieStore'

/**
 * Booléen persisté dans un cookie.
 *
 * Le HTML est pré-rendu côté Node, où aucun cookie n'existe : `useSyncExternalStore`
 * rend d'abord `defaultValue` puis bascule sur la valeur réelle après hydratation,
 * sans provoquer d'écart d'hydratation.
 */
export function useCookieState(
  name: string,
  defaultValue: boolean,
  { trueValue, falseValue }: { trueValue: string; falseValue: string },
) {
  const stored = useSyncExternalStore(
    subscribeCookies,
    () => readCookie(name),
    () => null,
  )

  const value = stored === null ? defaultValue : stored === trueValue

  const setValue = useCallback(
    (next: boolean | ((previous: boolean) => boolean)) => {
      const resolved = typeof next === 'function' ? next(value) : next
      writeCookie(name, resolved ? trueValue : falseValue)
    },
    [name, value, trueValue, falseValue],
  )

  return [value, setValue] as const
}

/**
 * Texte persisté dans un cookie, mêmes précautions d'hydratation que le
 * booléen ci-dessus. Une valeur vide retombe sur `defaultValue`.
 */
export function useCookieText(name: string, defaultValue: string) {
  const stored = useSyncExternalStore(
    subscribeCookies,
    () => readCookie(name),
    () => null,
  )

  const value = stored ? stored : defaultValue

  const setValue = useCallback((next: string) => writeCookie(name, next.trim()), [name])

  return [value, setValue] as const
}
