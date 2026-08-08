/**
 * Récupération d'un média depuis un lien direct.
 *
 * Le fichier est téléchargé par le navigateur puis rangé dans la bibliothèque comme
 * n'importe quel fichier déposé — il n'y a ni serveur ni stockage distant.
 *
 * Contrainte à connaître : la page étant servie depuis une autre origine, le site
 * distant doit autoriser le partage entre origines. Beaucoup ne le font pas, et
 * rien côté application ne peut y remédier ; d'où les messages d'erreur explicites.
 */

const AUDIO_TYPES: Record<string, string> = {
  mp3: 'audio/mpeg',
  ogg: 'audio/ogg',
  oga: 'audio/ogg',
  opus: 'audio/opus',
  wav: 'audio/wav',
  flac: 'audio/flac',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  weba: 'audio/webm',
  webm: 'audio/webm',
}

const IMAGE_TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
  bmp: 'image/bmp',
  svg: 'image/svg+xml',
}

function extensionOf(pathname: string): string {
  const last = pathname.split('/').pop() ?? ''
  const dot = last.lastIndexOf('.')
  return dot === -1 ? '' : last.slice(dot + 1).toLowerCase()
}

/** Nom de fichier déduit du chemin de l'URL, sans la chaîne de requête. */
function fileNameFrom(url: URL): string {
  const last = decodeURIComponent(url.pathname.split('/').filter(Boolean).pop() ?? '')
  return last || 'Média distant'
}

/**
 * Détermine le type du média. L'en-tête du serveur fait foi quand il est exploitable ;
 * beaucoup d'hébergeurs renvoient `application/octet-stream`, on retombe alors sur
 * l'extension du lien.
 */
function resolveType(headerType: string | null, extension: string): string | null {
  const declared = headerType?.split(';')[0].trim().toLowerCase() ?? ''
  if (declared.startsWith('audio/') || declared.startsWith('image/')) return declared
  return AUDIO_TYPES[extension] ?? IMAGE_TYPES[extension] ?? null
}

export async function fetchRemoteMedia(rawUrl: string, name?: string): Promise<File> {
  let url: URL
  try {
    url = new URL(rawUrl.trim())
  } catch {
    throw new Error('Ce lien n’est pas une adresse valide.')
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Seuls les liens http et https sont acceptés.')
  }

  let response: Response
  try {
    response = await fetch(url.toString())
  } catch {
    // `fetch` ne distingue pas un refus de partage entre origines d'une panne réseau.
    throw new Error(
      'Le site distant a refusé le téléchargement, ou il est injoignable. ' +
        'C’est une restriction du site, pas de l’application : essayez un autre hébergeur.',
    )
  }

  if (!response.ok) {
    throw new Error(`Le site distant a répondu ${response.status}.`)
  }

  const blob = await response.blob()
  const extension = extensionOf(url.pathname)
  const type = resolveType(response.headers.get('content-type'), extension)

  if (!type) {
    throw new Error('Ce lien ne pointe pas vers un fichier audio ou une image.')
  }

  const chosenName = name?.trim() || fileNameFrom(url)
  return new File([blob], chosenName, { type })
}
