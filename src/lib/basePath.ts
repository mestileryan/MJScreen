/**
 * Préfixe d'URL sous lequel l'application est servie (`/MJScreen` sur GitHub Pages).
 * Next préfixe automatiquement les liens et les assets qu'il gère, mais pas les
 * fichiers de `public/` que l'on référence à la main (fenêtre de présentation, sprite).
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

/** Construit l'URL d'un fichier de `public/` en tenant compte du basePath. */
export function publicUrl(path: string): string {
  return `${BASE_PATH}/${path.replace(/^\//, '')}`
}
