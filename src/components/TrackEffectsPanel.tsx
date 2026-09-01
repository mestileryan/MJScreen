'use client'

import { RotateCcw } from 'lucide-react'
import { FadeStepper, Row, Segmented, type Choice } from './panelControls'
import { DEFAULT_EFFECTS, LOWPASS_OFF, isNeutral } from '@/models/TrackEffects'
import type TrackEffects from '@/models/TrackEffects'
import type { PlaylistFades } from '@/models/TrackEffects'

interface TrackEffectsPanelProps {
  /** Réglages enregistrés sur la piste : les fondus absents suivent la playlist. */
  effects: TrackEffects
  /** Fondus par défaut de la playlist, affichés quand la piste n'écrase rien. */
  inheritedFades: PlaylistFades
  onChange: (effects: TrackEffects) => void
}

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

type EffectsChoice = Choice<Partial<TrackEffects>>

const PITCH_CHOICES: EffectsChoice[] = [
  { label: '-12', title: 'Le plus grave', value: { detune: -12 } },
  { label: '-6', title: 'Plus grave', value: { detune: -6 } },
  { label: '-2', title: 'Légèrement plus grave', value: { detune: -2 } },
  { label: '0', title: 'Normal', value: { detune: 0 } },
  { label: '+2', title: 'Légèrement plus aigu', value: { detune: 2 } },
  { label: '+6', title: 'Plus aigu', value: { detune: 6 } },
  { label: '+12', title: 'Le plus aigu', value: { detune: 12 } },
]
const PITCH_VALUES = [-12, -6, -2, 0, 2, 6, 12]

const REVERB_CHOICES: EffectsChoice[] = [
  { label: 'Normal', title: 'Aucune réverbération', value: { reverbMix: 0 } },
  { label: 'Faible', title: 'Une salle, une crypte', value: { reverbMix: 0.5, reverbSize: 0.75 } },
  { label: 'Forte', title: 'Une cathédrale, une grande caverne', value: { reverbMix: 0.8, reverbSize: 0.75 } },
]
const REVERB_VALUES = [0, 0.5, 0.8]

const LOWPASS_CHOICES: EffectsChoice[] = [
  { label: 'Normal', title: 'Aucun filtrage', value: { lowpass: LOWPASS_OFF } },
  { label: 'Léger', title: 'Derrière une porte, dans la pièce d’à côté', value: { lowpass: 800 } },
  { label: 'Fort', title: 'Sous l’eau, très loin, à travers un mur', value: { lowpass: 200 } },
]
const LOWPASS_VALUES = [LOWPASS_OFF, 800, 200]

const ECHO_CHOICES: EffectsChoice[] = [
  { label: 'Normal', title: 'Aucun écho', value: { echoMix: 0 } },
  { label: 'Faible', title: 'Une caverne', value: { echoMix: 0.3, echoTime: 0.7, echoFeedback: 0.5 } },
  { label: 'Fort', title: 'Une incantation, une voix d’outre-tombe', value: { echoMix: 0.6, echoTime: 1, echoFeedback: 0.59 } },
]
const ECHO_VALUES = [0, 0.3, 0.6]

const DISTORTION_CHOICES: EffectsChoice[] = [
  { label: 'Normal', title: 'Aucune distorsion', value: { distortion: 0 } },
  { label: 'Faible', title: 'Une radio, un grésillement', value: { distortion: 0.3 } },
  { label: 'Forte', title: 'Une voix démoniaque', value: { distortion: 1 } },
]
const DISTORTION_VALUES = [0, 0.3, 1]

export default function TrackEffectsPanel({
  effects,
  inheritedFades,
  onChange,
}: TrackEffectsPanelProps) {
  const set = (values: Partial<TrackEffects>) => onChange({ ...effects, ...values })

  return (
    <div className="mt-2 space-y-1.5 rounded bg-gray-900/60 p-2 text-xs">
      <Row
        label="Fondu"
        hint="Monte le son progressivement à la lecture, et le baisse avant l’arrêt. Sans réglage propre, la piste suit le fondu de sa playlist."
        modified={effects.fadeIn !== undefined || effects.fadeOut !== undefined}
        onReset={() => set({ fadeIn: undefined, fadeOut: undefined })}
      >
        <div className="flex flex-1 items-center justify-between">
          <FadeStepper
            label="In"
            title="Fondu d’entrée, en secondes"
            value={effects.fadeIn ?? inheritedFades.fadeIn}
            inherited={effects.fadeIn === undefined}
            onChange={fadeIn => set({ fadeIn })}
          />
          <FadeStepper
            label="Out"
            title="Fondu de sortie, en secondes"
            value={effects.fadeOut ?? inheritedFades.fadeOut}
            inherited={effects.fadeOut === undefined}
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
          onSelect={set}
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
          onSelect={set}
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
          onSelect={set}
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
          onSelect={set}
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
          onSelect={set}
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
