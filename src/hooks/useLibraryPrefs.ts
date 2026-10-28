'use client'

import { useCookieState } from './useCookieState'

const BOOLEAN_COOKIE = { trueValue: 'true', falseValue: 'false' }

/**
 * Préférences du poste liées à la bibliothèque de pistes. En cookie comme les
 * préférences d'affichage : elles décrivent ce poste, pas la bibliothèque.
 */
export function useLibraryPrefs() {
  // Une piste importée dans le jukebox et inconnue de la bibliothèque : on propose
  // de l'y ranger. Désactivé par défaut, et sans objet tant qu'aucune source n'existe.
  const [offerToLibrary, setOfferToLibrary] = useCookieState('offerToLibrary', false, BOOLEAN_COOKIE)

  return { offerToLibrary, setOfferToLibrary }
}
