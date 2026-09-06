'use client'

import { useCookieState } from './useCookieState'

/**
 * Deux façons d'utiliser l'application :
 *  - *planification* (défaut) : on organise la bibliothèque, on règle les pistes ;
 *  - *jeu* : en séance, on ne fait plus que lancer et arrêter. Toute la
 *    configuration disparaît — sauf la boucle, qu'on oublie souvent de régler
 *    avant — pour une interface la plus dépouillée possible.
 * Persisté en cookie : une séance survit à un rechargement.
 */
export function useAppMode() {
  const [gameMode, setGameMode] = useCookieState('appMode', false, {
    trueValue: 'game',
    falseValue: 'planning',
  })
  return { gameMode, setGameMode }
}
