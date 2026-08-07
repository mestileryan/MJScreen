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
