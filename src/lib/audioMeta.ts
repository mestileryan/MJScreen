import type { TrackMeta } from '@/models/TracksLibraryIndex'
import { META_FIELDS } from '@/models/TracksLibraryIndex'

/** Sous-ensemble de ce que music-metadata met dans `common`, tous formats confondus. */
export interface CommonTags {
  title?: string
  artist?: string
  album?: string
  genre?: string[]
  comment?: { text?: string }[] | string[]
}

const clean = (value: string | undefined) => {
  const text = value?.trim()
  return text ? text : undefined
}

/** Ne garde que les cinq champs qui nous servent, nettoyés ; un objet vide s’il n’y a rien. */
export function metaFromCommon(common: CommonTags): TrackMeta {
  const comment = common.comment
    ?.map(c => (typeof c === 'string' ? c : c.text))
    .map(clean)
    .find(Boolean)
  const meta: TrackMeta = {
    title: clean(common.title),
    artist: clean(common.artist),
    album: clean(common.album),
    genre: clean(common.genre?.filter(Boolean).join(', ')),
    comment,
  }
  return Object.fromEntries(Object.entries(meta).filter(([, v]) => v !== undefined)) as TrackMeta
}

/**
 * Lit les métadonnées d’un fichier audio (ID3 pour le MP3, commentaires Vorbis
 * pour OGG et FLAC, atomes pour M4A…). Le lecteur n’est chargé qu’au premier
 * usage : il pèse, et la page n’en a pas besoin pour s’afficher.
 * Un fichier illisible donne un objet vide, pour ne pas être relu sans fin.
 */
export async function readAudioMeta(blob: Blob): Promise<TrackMeta> {
  try {
    const { parseBlob } = await import('music-metadata')
    const { common } = await parseBlob(blob, { skipCovers: true, duration: false, skipPostHeaders: true })
    return metaFromCommon(common as CommonTags)
  } catch {
    return {}
  }
}

export function hasMeta(meta: TrackMeta | undefined): meta is TrackMeta {
  return !!meta && Object.values(meta).some(Boolean)
}

/** Lignes « Titre : … » pour l’infobulle. */
export function describeMeta(meta: TrackMeta): string {
  return META_FIELDS.filter(({ key }) => meta[key])
    .map(({ key, label }) => `${label} : ${meta[key]}`)
    .join('\n')
}
