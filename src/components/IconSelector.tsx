'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { CircleX } from 'lucide-react'
import iconList from '@/assets/icon-list.json'
import { DEFAULT_ICON_COLOR } from '@/models/FileTrack'

interface IconMeta {
  path: string
  name: string
}

interface IconSelectorProps {
  initialSearch?: string
  initialColor?: string
  onIconChosen: (payload: { iconName: string; color: string }) => void
  onClose: () => void
}

/** Nombre d’icônes qu’on affiche par “page” */
const ICONS_PER_PAGE = 20
/**
 * Première “page” volontairement plus grande que la hauteur du conteneur, pour que
 * celui-ci déborde toujours et que l'infinite scroll puisse s'amorcer.
 */
const INITIAL_ICONS = 60

// Liste complète construite une seule fois : le sprite contient plusieurs milliers d'icônes.
const iconsArray: IconMeta[] = (iconList as string[]).map(name => ({
  path: `/src/assets/game-icons/${name}.svg`,
  name,
}))

export default function IconSelector({
  initialSearch,
  initialColor,
  onIconChosen,
  onClose,
}: IconSelectorProps) {
  /** Barre de recherche */
  const [searchTerm, setSearchTerm] = useState(initialSearch ?? '')
  const [selectedColor, setSelectedColor] = useState(initialColor || DEFAULT_ICON_COLOR)
  const [visibleCount, setVisibleCount] = useState(INITIAL_ICONS)

  const searchInput = useRef<HTMLInputElement>(null)
  /** Détecter le scroll */
  const scrollContainer = useRef<HTMLDivElement>(null)

  /** Filtrer la liste globale en fonction de searchTerm (insensible à la casse) */
  const filteredIcons = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return iconsArray
    return iconsArray.filter(icon => icon.name.toLowerCase().includes(term))
  }, [searchTerm])

  const visibleIcons = filteredIcons.slice(0, visibleCount)

  useEffect(() => {
    searchInput.current?.focus()
    searchInput.current?.select()
  }, [])

  /** A chaque changement du champ de recherche, on reset la pagination */
  function handleSearchChange(value: string) {
    setSearchTerm(value)
    setVisibleCount(INITIAL_ICONS)
  }

  function handleScroll() {
    const el = scrollContainer.current
    if (!el) return
    const scrollBottom = el.scrollHeight - (el.scrollTop + el.clientHeight)

    // Si on est proche du bas, on charge la suite
    if (scrollBottom < 50) {
      setVisibleCount(count => Math.min(count + ICONS_PER_PAGE, filteredIcons.length))
    }
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-10">
        {/* Titre à gauche */}
        <h2 className="font-bold text-white">Choisissez une icône</h2>

        {/* Groupement de la barre de recherche et du bouton à droite */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            ref={searchInput}
            value={searchTerm}
            onChange={event => handleSearchChange(event.target.value)}
            onFocus={event => event.target.select()}
            className="p-2 rounded bg-gray-700 text-white mr-4"
            placeholder="Rechercher une icône..."
          />
          <input
            type="color"
            value={selectedColor}
            onChange={event => setSelectedColor(event.target.value)}
            className="w-8 h-8 p-0 border-0 bg-transparent mr-6"
          />
          <button className="text-white hover:text-red-400 transition-colors" onClick={onClose}>
            <CircleX />
          </button>
        </div>
      </div>

      {/* Container scrollable où se produit l’infinite scroll */}
      <div
        className="grid grid-cols-6 gap-3 max-h-72 overflow-y-auto"
        ref={scrollContainer}
        onScroll={handleScroll}
      >
        {visibleIcons.map(icon => (
          <div
            key={icon.path}
            className="flex flex-col items-center cursor-pointer text-gray-400 hover:text-purple-300"
            onClick={() => onIconChosen({ iconName: icon.name, color: selectedColor })}
          >
            <svg className="w-8 h-8 text-purple-400" style={{ color: selectedColor }}>
              <use href={`#${icon.name}`} />
            </svg>
            <span className="text-xs text-gray-300">{icon.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
