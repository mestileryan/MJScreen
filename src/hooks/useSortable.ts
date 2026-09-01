'use client'

import { useEffect, useRef, type RefObject } from 'react'
import Sortable, { type SortableEvent, type Options } from 'sortablejs'

/**
 * Remplace `vuedraggable`, qui n'était lui-même qu'une enveloppe autour de SortableJS.
 *
 * SortableJS déplace les nœuds directement dans le DOM, ce que React ne tolère pas :
 * on annule donc systématiquement sa modification (`revertDomMove`) avant de notifier
 * l'appelant, qui met à jour son state. React reste ainsi la seule source de vérité.
 */
export interface SortableMove {
  /** Conteneur d'origine (porte les `data-*` posés par l'appelant). */
  from: HTMLElement
  /** Conteneur d'arrivée, identique à `from` pour un simple réordonnancement. */
  to: HTMLElement
  oldIndex: number
  newIndex: number
}

function revertDomMove(evt: SortableEvent) {
  const { item, from, oldIndex } = evt
  item.remove()
  from.insertBefore(item, from.children[oldIndex ?? 0] ?? null)
}

export function useSortable(
  ref: RefObject<HTMLElement | null>,
  onMove: (move: SortableMove) => void,
  options: Omit<Options, 'onEnd'> = {},
) {
  // Les handlers et options sont lus au moment de l'événement : on garde une seule
  // instance Sortable pour la durée de vie du conteneur.
  const onMoveRef = useRef(onMove)
  const optionsRef = useRef(options)

  useEffect(() => {
    onMoveRef.current = onMove
    optionsRef.current = options
  })

  // `disabled` doit être répercuté à chaud sans recréer l'instance.
  const disabled = options.disabled ?? false
  const instanceRef = useRef<Sortable | null>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const instance = Sortable.create(element, {
      // Pas de drag natif HTML5 : pendant un drag natif le navigateur coupe les
      // événements de molette, impossible donc de faire défiler la bibliothèque
      // en cours de glissement. Le mode fallback (déjà celui du tactile) simule
      // le drag aux événements souris et laisse la molette vivre normalement.
      forceFallback: true,
      // Le clone qui suit le curseur est posé sur <body> : il échappe ainsi au
      // rognage des conteneurs `overflow-auto` et à leurs styles hérités.
      fallbackOnBody: true,
      // Quelques pixels de jeu pour distinguer un clic (lecture d'une piste en
      // mode soundboard) d'un début de glissement.
      fallbackTolerance: 3,
      // Défilement automatique près des bords pendant un glissement, sur tous
      // les ancêtres scrollables (`bubbleScroll`, actif d'office). Zone de
      // déclenchement élargie et vitesse relevée : un glissement d'une playlist
      // à l'autre traverse de longues listes.
      scroll: true,
      scrollSensitivity: 80,
      scrollSpeed: 15,
      ...optionsRef.current,
      onEnd(evt) {
        const { from, to, oldIndex, newIndex } = evt
        if (oldIndex == null || newIndex == null) return
        if (from === to && oldIndex === newIndex) return

        revertDomMove(evt)
        onMoveRef.current({
          from: from as HTMLElement,
          to: to as HTMLElement,
          oldIndex,
          newIndex,
        })
      },
    })
    instanceRef.current = instance

    return () => {
      instance.destroy()
      instanceRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    instanceRef.current?.option('disabled', disabled)
  }, [disabled])
}
