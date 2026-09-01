'use client'

import { FadeStepper, Row, Segmented, type Choice } from './panelControls'
import type Playlist from '@/models/Playlist'
import type { PlaylistMode } from '@/models/Playlist'

interface PlaylistSettingsPanelProps {
  playlist: Playlist
  onChange: (playlist: Playlist) => void
}

const MODE_CHOICES: Choice<PlaylistMode>[] = [
  {
    label: 'Libre',
    title:
      'Les pistes se cumulent : chaque lancement s’ajoute à ce qui joue déjà. Pour superposer musique d’ambiance et bruitages.',
    value: 'libre',
  },
  {
    label: 'Enchaîn.',
    title:
      'Une seule piste de la playlist à la fois : en lancer une remplace immédiatement celle en cours, en fondu si la playlist en a un. Pour changer d’ambiance d’un clic.',
    value: 'enchainement',
  },
  {
    label: 'Classique',
    title:
      'Comme un album : une seule piste à la fois, et la suivante démarre toute seule quand la piste se termine (sauf boucle). Après la dernière, la playlist recommence.',
    value: 'classique',
  },
]
const MODE_VALUES: PlaylistMode[] = ['libre', 'enchainement', 'classique']

/** Vrai si la playlist a une configuration qui s'écarte du comportement historique. */
export function isPlaylistTweaked(playlist: Playlist): boolean {
  return playlist.mode !== 'libre' || playlist.fadeIn > 0 || playlist.fadeOut > 0
}

export default function PlaylistSettingsPanel({ playlist, onChange }: PlaylistSettingsPanelProps) {
  const set = (values: Partial<Playlist>) => onChange({ ...playlist, ...values })

  return (
    // Largeur plafonnée : la playlist peut occuper tout l'écran en vue liste,
    // mais des réglages étirés sur cette largeur seraient illisibles. On reste
    // sur le gabarit compact du panneau d'effets du lecteur, calé à droite —
    // sous le bouton qui l'ouvre.
    <div className="mb-2 ml-auto w-full max-w-sm space-y-1.5 rounded bg-gray-900/60 p-2 text-xs">
      <Row
        label="Lecture"
        hint="Comment les pistes de la playlist s’enchaînent : librement, en remplaçant la lecture en cours, ou automatiquement l’une après l’autre."
        modified={playlist.mode !== 'libre'}
        onReset={() => set({ mode: 'libre' })}
      >
        <Segmented
          choices={MODE_CHOICES}
          index={MODE_VALUES.indexOf(playlist.mode)}
          onSelect={mode => set({ mode })}
        />
      </Row>

      <Row
        label="Fondu"
        hint="Fondu par défaut des pistes de la playlist, en secondes. Une piste avec son propre réglage de fondu le conserve."
        modified={playlist.fadeIn > 0 || playlist.fadeOut > 0}
        onReset={() => set({ fadeIn: 0, fadeOut: 0 })}
      >
        <div className="flex flex-1 items-center justify-between">
          <FadeStepper
            label="In"
            title="Fondu d’entrée par défaut, en secondes"
            value={playlist.fadeIn}
            onChange={fadeIn => set({ fadeIn })}
          />
          <FadeStepper
            label="Out"
            title="Fondu de sortie par défaut, en secondes"
            value={playlist.fadeOut}
            onChange={fadeOut => set({ fadeOut })}
          />
        </div>
      </Row>
    </div>
  )
}
