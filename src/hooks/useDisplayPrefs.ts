'use client'

import { useCookieState, useCookieText } from './useCookieState'

const BOOLEAN_COOKIE = { trueValue: 'true', falseValue: 'false' }

/**
 * Largeur maximale de l'application, en pixels — `full` pour ne rien plafonner.
 * 1380 est le gabarit qui rend le mieux : au-delà, sur un grand moniteur, le
 * nom d'une piste s'éloigne trop de ses boutons.
 */
export const LAYOUT_WIDTH_CHOICES = [
  { value: '1200', label: '1200 px' },
  { value: '1380', label: '1380 px' },
  { value: '1600', label: '1600 px' },
  { value: '1800', label: '1800 px' },
  { value: '2000', label: '2000 px' },
  { value: 'full', label: 'Pleine largeur' },
] as const
export const DEFAULT_LAYOUT_WIDTH = '1380'

/**
 * Préférences d'affichage, réglées depuis la roue crantée. Purement
 * cosmétiques, elles vivent en cookie et non dans la base : elles décrivent le
 * poste, pas la bibliothèque. Le détail des cartes (taille, lien…) n'est plus
 * une préférence : il suit le mode Planification / Jeu.
 */
export function useDisplayPrefs() {
  const [layoutWidth, setLayoutWidth] = useCookieText('layoutMaxWidth', DEFAULT_LAYOUT_WIDTH)
  const [lightMode, setLightMode] = useCookieState('lightMode', false, BOOLEAN_COOKIE)

  return {
    lightMode,
    setLightMode,
    layoutWidth,
    setLayoutWidth,
    /** Valeur CSS prête à poser en `maxWidth` ; `undefined` = pas de plafond. */
    layoutMaxWidth: layoutWidth === 'full' ? undefined : `${layoutWidth}px`,
  }
}
