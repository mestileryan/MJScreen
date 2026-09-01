'use client'

/**
 * Contrôles partagés par les panneaux de réglages compacts (effets d'une piste,
 * configuration d'une playlist) : ligne à libellé, sélecteur segmenté et
 * compteur de durée de fondu.
 */
import { Minus, Plus, RotateCcw } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTooltip } from '@/hooks/useTooltip'

export const FADE_STEP = 0.5
export const MAX_FADE = 30

export interface Choice<T> {
  label: string
  title: string
  value: T
}

/**
 * Bouton d'un sélecteur segmenté. L'explication passe par l'infobulle tippy de
 * l'application plutôt que par un `title` natif : elle apparaît sans délai, ce
 * qui permet de balayer les choix pour comparer avant de cliquer.
 */
function SegmentedButton({
  title,
  selected,
  divided,
  onClick,
  children,
}: {
  title: string
  selected: boolean
  divided: boolean
  onClick: () => void
  children: ReactNode
}) {
  const tooltip = useTooltip(title)

  return (
    <button
      ref={tooltip}
      onClick={onClick}
      className={`flex-1 px-1 py-0.5 tabular-nums transition-colors ${
        divided ? 'border-l border-gray-700' : ''
      } ${selected ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
    >
      {children}
    </button>
  )
}

/** Sélecteur segmenté ; la première position est toujours l'état neutre. */
export function Segmented<T>({
  choices,
  index,
  onSelect,
}: {
  choices: Choice<T>[]
  index: number
  onSelect: (value: T) => void
}) {
  return (
    <div className="flex flex-1 overflow-hidden rounded border border-gray-700">
      {choices.map((choice, position) => (
        <SegmentedButton
          key={choice.label}
          title={choice.title}
          selected={position === index}
          divided={position > 0}
          onClick={() => onSelect(choice.value)}
        >
          {choice.label}
        </SegmentedButton>
      ))}
    </div>
  )
}

/** Ligne du panneau : réinitialisation, libellé expliqué en infobulle, contrôle. */
export function Row({
  label,
  hint,
  modified,
  onReset,
  children,
}: {
  label: string
  hint: string
  modified: boolean
  onReset: () => void
  children: ReactNode
}) {
  const tooltip = useTooltip(hint)

  return (
    <div className="flex items-center gap-2">
      <button
        className="shrink-0 rounded p-0.5 text-gray-500 transition-colors hover:bg-gray-700
          hover:text-white disabled:opacity-20 disabled:hover:bg-transparent"
        onClick={onReset}
        disabled={!modified}
        aria-label={`Réinitialiser ${label}`}
        title={`Réinitialiser ${label}`}
      >
        <RotateCcw className="h-3 w-3" />
      </button>
      <span ref={tooltip} className="w-14 shrink-0 cursor-help text-gray-400 sm:w-[4.5rem]">
        {label}
      </span>
      {children}
    </div>
  )
}

/**
 * Compteur compact pour les durées de fondu.
 * `inherited` signale une valeur venue de la playlist et non de la piste :
 * elle s'affiche en retrait, et le premier cran la transforme en réglage propre.
 */
export function FadeStepper({
  label,
  title,
  value,
  inherited = false,
  onChange,
}: {
  label: string
  title: string
  value: number
  inherited?: boolean
  onChange: (value: number) => void
}) {
  // Le pas flottant dérive vite (0.3 + 0.3 + 0.3 = 0.8999…) : on arrondit au cran.
  const nudge = (delta: number) =>
    onChange(Math.min(MAX_FADE, Math.max(0, Math.round((value + delta) * 10) / 10)))

  return (
    <div
      className="flex items-center gap-0.5"
      title={inherited ? `${title} — suit le réglage de la playlist` : title}
    >
      <span className="text-gray-500">{label}</span>
      <button
        className="rounded p-0.5 text-gray-400 hover:bg-gray-700 hover:text-white disabled:opacity-30"
        onClick={() => nudge(-FADE_STEP)}
        disabled={value <= 0}
        aria-label={`Diminuer ${title}`}
      >
        <Minus className="h-3 w-3" />
      </button>
      <span
        className={`w-7 text-center tabular-nums ${
          inherited ? 'italic text-gray-500' : 'text-gray-200'
        }`}
      >
        {value.toFixed(1)}
      </span>
      <button
        className="rounded p-0.5 text-gray-400 hover:bg-gray-700 hover:text-white disabled:opacity-30"
        onClick={() => nudge(FADE_STEP)}
        disabled={value >= MAX_FADE}
        aria-label={`Augmenter ${title}`}
      >
        <Plus className="h-3 w-3" />
      </button>
    </div>
  )
}
