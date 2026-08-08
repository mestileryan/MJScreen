'use client'

import { Minus, Plus, RotateCcw } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTooltip } from '@/hooks/useTooltip'
import { DEFAULT_EFFECTS, LOWPASS_OFF, isNeutral } from '@/models/TrackEffects'
import type TrackEffects from '@/models/TrackEffects'

interface TrackEffectsPanelProps {
  effects: TrackEffects
  onChange: (effects: TrackEffects) => void
}

const FADE_STEP = 0.5
const MAX_FADE = 30

/** Réglage le plus proche d'une valeur : tolère les enregistrements hors préréglage. */
function nearestIndex(value: number, candidates: number[]): number {
  let best = 0
  let bestDistance = Infinity
  candidates.forEach((candidate, index) => {
    const distance = Math.abs(candidate - value)
    if (distance < bestDistance) {
      bestDistance = distance
      best = index
    }
  })
  return best
}

interface Choice {
  label: string
  title: string
  values: Partial<TrackEffects>
}

/** Sélecteur segmenté ; la première position est toujours l'état neutre. */
function Segmented({
  choices,
  index,
  onSelect,
}: {
  choices: Choice[]
  index: number
  onSelect: (choice: Choice) => void
}) {
  return (
    <div className="flex flex-1 overflow-hidden rounded border border-gray-700">
      {choices.map((choice, position) => (
        <button
          key={choice.label}
          title={choice.title}
          onClick={() => onSelect(choice)}
          className={`flex-1 px-1 py-0.5 tabular-nums transition-colors ${
            position > 0 ? 'border-l border-gray-700' : ''
          } ${
            position === index
              ? 'bg-purple-600 text-white'
              : 'text-gray-300 hover:bg-gray-700'
          }`}
        >
          {choice.label}
        </button>
      ))}
    </div>
  )
}

/** Ligne du panneau : réinitialisation, libellé expliqué en infobulle, contrôle. */
function Row({
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

/** Compteur compact pour les durées de fondu. */
function FadeStepper({
  label,
  title,
  value,
  onChange,
}: {
  label: string
  title: string
  value: number
  onChange: (value: number) => void
}) {
  // Le pas flottant dérive vite (0.3 + 0.3 + 0.3 = 0.8999…) : on arrondit au cran.
  const nudge = (delta: number) =>
    onChange(Math.min(MAX_FADE, Math.max(0, Math.round((value + delta) * 10) / 10)))

  return (
    <div className="flex items-center gap-0.5" title={title}>
      <span className="text-gray-500">{label}</span>
      <button
        className="rounded p-0.5 text-gray-400 hover:bg-gray-700 hover:text-white disabled:opacity-30"
        onClick={() => nudge(-FADE_STEP)}
        disabled={value <= 0}
        aria-label={`Diminuer ${title}`}
      >
        <Minus className="h-3 w-3" />
      </button>
      <span className="w-7 text-center tabular-nums text-gray-200">{value.toFixed(1)}</span>
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

const PITCH_CHOICES: Choice[] = [
  { label: '-12', title: 'Le plus grave', values: { detune: -12 } },
  { label: '-6', title: 'Plus grave', values: { detune: -6 } },
  { label: '-2', title: 'Légèrement plus grave', values: { detune: -2 } },
  { label: '0', title: 'Normal', values: { detune: 0 } },
  { label: '+2', title: 'Légèrement plus aigu', values: { detune: 2 } },
  { label: '+6', title: 'Plus aigu', values: { detune: 6 } },
  { label: '+12', title: 'Le plus aigu', values: { detune: 12 } },
]
const PITCH_VALUES = [-12, -6, -2, 0, 2, 6, 12]

const REVERB_CHOICES: Choice[] = [
  { label: 'Normal', title: 'Aucune réverbération', values: { reverbMix: 0 } },
  { label: 'Faible', title: 'Une salle, une crypte', values: { reverbMix: 0.5, reverbSize: 0.75 } },
  { label: 'Forte', title: 'Une cathédrale, une grande caverne', values: { reverbMix: 0.8, reverbSize: 0.75 } },
]
const REVERB_VALUES = [0, 0.5, 0.8]

const LOWPASS_CHOICES: Choice[] = [
  { label: 'Normal', title: 'Aucun filtrage', values: { lowpass: LOWPASS_OFF } },
  { label: 'Léger', title: 'Derrière une porte, dans la pièce d’à côté', values: { lowpass: 800 } },
  { label: 'Fort', title: 'Sous l’eau, très loin, à travers un mur', values: { lowpass: 200 } },
]
const LOWPASS_VALUES = [LOWPASS_OFF, 800, 200]

const ECHO_CHOICES: Choice[] = [
  { label: 'Normal', title: 'Aucun écho', values: { echoMix: 0 } },
  { label: 'Faible', title: 'Une caverne', values: { echoMix: 0.3, echoTime: 0.7, echoFeedback: 0.5 } },
  { label: 'Fort', title: 'Une incantation, une voix d’outre-tombe', values: { echoMix: 0.6, echoTime: 1, echoFeedback: 0.59 } },
]
const ECHO_VALUES = [0, 0.3, 0.6]

const DISTORTION_CHOICES: Choice[] = [
  { label: 'Normal', title: 'Aucune distorsion', values: { distortion: 0 } },
  { label: 'Faible', title: 'Une radio, un grésillement', values: { distortion: 0.3 } },
  { label: 'Forte', title: 'Une voix démoniaque', values: { distortion: 1 } },
]
const DISTORTION_VALUES = [0, 0.3, 1]

export default function TrackEffectsPanel({ effects, onChange }: TrackEffectsPanelProps) {
  const set = (values: Partial<TrackEffects>) => onChange({ ...effects, ...values })

  return (
    <div className="mt-2 space-y-1.5 rounded bg-gray-900/60 p-2 text-xs">
      <Row
        label="Fondu"
        hint="Monte le son progressivement à la lecture, et le baisse avant l’arrêt. Pour enchaîner deux ambiances sans coupure sèche."
        modified={effects.fadeIn > 0 || effects.fadeOut > 0}
        onReset={() => set({ fadeIn: 0, fadeOut: 0 })}
      >
        <div className="flex flex-1 items-center justify-between">
          <FadeStepper
            label="In"
            title="Fondu d’entrée, en secondes"
            value={effects.fadeIn}
            onChange={fadeIn => set({ fadeIn })}
          />
          <FadeStepper
            label="Out"
            title="Fondu de sortie, en secondes"
            value={effects.fadeOut}
            onChange={fadeOut => set({ fadeOut })}
          />
        </div>
      </Row>

      <Row
        label="Latéral."
        hint="Place le son à gauche ou à droite, pour situer une source dans la scène."
        modified={effects.pan !== 0}
        onReset={() => set({ pan: 0 })}
      >
        <input
          type="range"
          className="min-w-0 flex-1"
          min={-1}
          max={1}
          step={0.01}
          value={effects.pan}
          onChange={event => set({ pan: Number(event.target.value) })}
          aria-label="Latéralisation"
        />
        <span className="w-12 shrink-0 text-right tabular-nums text-gray-200">
          {Math.abs(effects.pan) < 0.02
            ? 'Centre'
            : `${effects.pan < 0 ? 'G' : 'D'} ${Math.round(Math.abs(effects.pan) * 100)}%`}
        </span>
      </Row>

      <Row
        label="Hauteur"
        hint="Rend la piste plus grave ou plus aiguë. Elle est aussi ralentie ou accélérée, comme une bande."
        modified={effects.detune !== 0}
        onReset={() => set({ detune: 0 })}
      >
        <Segmented
          choices={PITCH_CHOICES}
          index={nearestIndex(effects.detune, PITCH_VALUES)}
          onSelect={choice => set(choice.values)}
        />
      </Row>

      <Row
        label="Réverb."
        hint="Ajoute l’écho d’un lieu autour du son, comme s’il était joué dans une salle."
        modified={effects.reverbMix > 0}
        onReset={() => set({ reverbMix: 0 })}
      >
        <Segmented
          choices={REVERB_CHOICES}
          index={nearestIndex(effects.reverbMix, REVERB_VALUES)}
          onSelect={choice => set(choice.values)}
        />
      </Row>

      <Row
        label="Étouffé"
        hint="Coupe les aigus : le son semble venir d’ailleurs, derrière un obstacle."
        modified={effects.lowpass < LOWPASS_OFF}
        onReset={() => set({ lowpass: LOWPASS_OFF })}
      >
        <Segmented
          choices={LOWPASS_CHOICES}
          index={nearestIndex(effects.lowpass, LOWPASS_VALUES)}
          onSelect={choice => set(choice.values)}
        />
      </Row>

      <Row
        label="Écho"
        hint="Répète le son en le laissant s’éteindre. Pour les cavernes et les incantations."
        modified={effects.echoMix > 0}
        onReset={() => set({ echoMix: 0 })}
      >
        <Segmented
          choices={ECHO_CHOICES}
          index={nearestIndex(effects.echoMix, ECHO_VALUES)}
          onSelect={choice => set(choice.values)}
        />
      </Row>

      <Row
        label="Distorsion"
        hint="Sature le son. Le volume est compensé automatiquement pour ne pas bondir."
        modified={effects.distortion > 0}
        onReset={() => set({ distortion: 0 })}
      >
        <Segmented
          choices={DISTORTION_CHOICES}
          index={nearestIndex(effects.distortion, DISTORTION_VALUES)}
          onSelect={choice => set(choice.values)}
        />
      </Row>

      <button
        className="flex w-full items-center justify-center gap-1 rounded border border-gray-700 py-1 text-gray-400
          transition-colors hover:bg-gray-700 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
        onClick={() => onChange(DEFAULT_EFFECTS)}
        disabled={isNeutral(effects)}
      >
        <RotateCcw className="h-3 w-3" />
        Tout réinitialiser
      </button>
    </div>
  )
}
