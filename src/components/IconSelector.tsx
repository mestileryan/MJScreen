'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { CircleX } from 'lucide-react'
import iconList from '@/assets/icon-list.json'
import TooltipButton from './TooltipButton'
import { readCookie, writeCookie } from '@/lib/cookieStore'
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

/**
 * Dernières couleurs réellement appliquées à une icône, pour uniformiser une
 * playlist en deux clics. Persistées en cookie, plus récente en premier.
 */
const RECENT_COLORS_COOKIE = 'recentIconColors'
const RECENT_COLORS_MAX = 5

function readRecentColors(): string[] {
  if (typeof document === 'undefined') return []
  const raw = readCookie(RECENT_COLORS_COOKIE)
  if (!raw) return []
  return raw
    .split(',')
    .filter(color => /^#[0-9a-f]{6}$/i.test(color))
    .slice(0, RECENT_COLORS_MAX)
}

function pushRecentColor(color: string): string[] {
  const normalized = color.toLowerCase()
  const next = [
    normalized,
    ...readRecentColors().filter(candidate => candidate !== normalized),
  ].slice(0, RECENT_COLORS_MAX)
  writeCookie(RECENT_COLORS_COOKIE, next.join(','))
  return next
}

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
  // Lu paresseusement : la modale n'est montée que côté client, sur un clic.
  const [recentColors, setRecentColors] = useState<string[]>(readRecentColors)

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

  /** Choisir une icône enregistre aussi sa couleur parmi les récentes. */
  function chooseIcon(iconName: string) {
    setRecentColors(pushRecentColor(selectedColor))
    onIconChosen({ iconName, color: selectedColor })
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
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 sm:mb-10">
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
            className="min-w-0 flex-1 rounded bg-gray-700 p-2 text-white sm:mr-4 sm:flex-none"
            placeholder="Rechercher une icône..."
          />
          {/* Couleurs récentes : un clic reprend la teinte d'une icône déjà
              réglée, pour garder une playlist homogène. */}
          {recentColors.length > 0 && (
            <div className="flex items-center gap-1.5 mr-1">
              {recentColors.map(color => (
                <TooltipButton
                  key={color}
                  tooltip={`Réutiliser ${color}`}
                  aria-label={`Réutiliser la couleur ${color}`}
                  onClick={() => setSelectedColor(color)}
                  className={`h-5 w-5 rounded-full border border-gray-500 transition-transform
                    hover:scale-110 ${
                      color === selectedColor.toLowerCase() ? 'ring-2 ring-white/70' : ''
                    }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          )}
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
        className="grid max-h-72 grid-cols-4 gap-3 overflow-y-auto sm:grid-cols-6"
        ref={scrollContainer}
        onScroll={handleScroll}
      >
        {visibleIcons.map(icon => (
          <div
            key={icon.path}
            className="flex flex-col items-center cursor-pointer text-gray-400 hover:text-purple-300"
            onClick={() => chooseIcon(icon.name)}
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
