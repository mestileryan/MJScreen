/**
 * Chemins relatifs à la racine de la bibliothèque, toujours au format POSIX
 * (`dossier/fichier.mp3`). La racine elle-même est la chaîne vide.
 * Un même format pour tous les fournisseurs : l'index reste valable quel que soit
 * le stockage sur lequel la bibliothèque est rouverte.
 */

/** Normalise un chemin et refuse tout ce qui sortirait de la racine. */
export function normalizePath(path: string): string {
  const segments: string[] = []
  for (const segment of path.replace(/\\/g, '/').split('/')) {
    if (segment === '' || segment === '.') continue
    if (segment === '..') throw new Error(`Chemin hors de la bibliothèque : « ${path} »`)
    segments.push(segment)
  }
  return segments.join('/')
}

/** Indique si le chemin est déjà normalisé et reste dans la racine. */
export function isSafeRelativePath(path: string): boolean {
  try {
    return normalizePath(path) === path
  } catch {
    return false
  }
}

export function joinPath(...parts: string[]): string {
  return normalizePath(parts.join('/'))
}

/** Découpe un chemin normalisé en segments ; la racine n'en a aucun. */
export function pathSegments(path: string): string[] {
  const normalized = normalizePath(path)
  return normalized === '' ? [] : normalized.split('/')
}

/** Dernier segment du chemin : le nom du fichier ou du dossier. */
export function baseName(path: string): string {
  const segments = pathSegments(path)
  return segments[segments.length - 1] ?? ''
}

/** Chemin du dossier parent ; la chaîne vide pour un élément à la racine. */
export function parentPath(path: string): string {
  return pathSegments(path).slice(0, -1).join('/')
}
