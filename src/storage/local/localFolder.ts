/**
 * Choix du dossier local et gestion de sa permission.
 * Chromium ne garde la permission d'écriture que le temps de la session : le handle
 * est conservé dans IndexedDB, mais il faut redemander l'accès, et seulement en
 * réponse à un geste de l'utilisateur (clic).
 */

const MODE: FileSystemHandlePermissionDescriptor = { mode: 'readwrite' }

/** Firefox et Safari n'exposent pas `showDirectoryPicker` : le mode local y est indisponible. */
export function isLocalFolderSupported(): boolean {
  return typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function'
}

/** Ouvre le sélecteur de dossier ; `null` si l'utilisateur l'a fermé sans choisir. */
export async function pickLocalFolder(): Promise<FileSystemDirectoryHandle | null> {
  if (!window.showDirectoryPicker) throw new Error('Le choix d\'un dossier local n\'est pas pris en charge par ce navigateur.')
  try {
    return await window.showDirectoryPicker({ id: 'mjlibrary', mode: 'readwrite', startIn: 'music' })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return null
    throw error
  }
}

/** État de la permission, sans rien demander à l'utilisateur. */
export async function queryFolderPermission(handle: FileSystemHandle): Promise<PermissionState> {
  // Sans `queryPermission`, le navigateur ne gère pas de permission par handle :
  // un handle obtenu est alors utilisable tel quel.
  return handle.queryPermission ? handle.queryPermission(MODE) : 'granted'
}

/** Demande l'accès en lecture et écriture. À n'appeler que depuis un geste de l'utilisateur. */
export async function requestFolderPermission(handle: FileSystemHandle): Promise<PermissionState> {
  if ((await queryFolderPermission(handle)) === 'granted') return 'granted'
  return handle.requestPermission ? handle.requestPermission(MODE) : 'granted'
}
