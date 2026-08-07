'use client'

import { useEffect } from 'react'
import { publicUrl } from '@/lib/basePath'

/**
 * Injecte le sprite `<symbol>` des game-icons dans le document.
 *
 * Le sprite pèse plusieurs mégaoctets : il est servi depuis `public/` et récupéré
 * après le montage plutôt qu'inliné dans le HTML exporté, afin que le navigateur
 * puisse le mettre en cache sans retarder le premier rendu.
 */
export default function IconSpriteLoader() {
  useEffect(() => {
    if (document.querySelector('.svg-sprite')) return

    let cancelled = false
    fetch(publicUrl('icon-sprite.svg'))
      .then(response => response.text())
      .then(markup => {
        if (cancelled || document.querySelector('.svg-sprite')) return
        const host = document.createElement('div')
        host.className = 'svg-sprite'
        host.innerHTML = markup
        document.body.appendChild(host)
      })
      .catch(error => {
        console.error("Impossible de charger le sprite d'icônes :", error)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return null
}
