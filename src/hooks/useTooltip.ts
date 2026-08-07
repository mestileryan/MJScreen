'use client'

import { useCallback, useEffect, useRef } from 'react'
import tippy, { type Instance } from 'tippy.js'

/**
 * Remplace la directive `v-tooltip`. Le ref retourné est à poser sur l'élément qui
 * doit porter l'infobulle ; c'est un ref *callback*, l'infobulle suit donc l'élément
 * même si celui-ci n'est monté que dans certaines branches de rendu.
 */
export function useTooltip(content: string) {
  const instance = useRef<Instance | null>(null)
  const contentRef = useRef(content)

  const ref = useCallback((element: Element | null) => {
    instance.current?.destroy()
    // delay [show, hide] : on veut instant show, un petit délai hide
    instance.current = element
      ? tippy(element, { content: contentRef.current, delay: [0, 100] })
      : null
  }, [])

  useEffect(() => {
    // Mémorisé pour que l'infobulle soit recréée avec le bon contenu si l'élément
    // porteur est démonté puis remonté.
    contentRef.current = content
    instance.current?.setContent(content)
  }, [content])

  return ref
}
