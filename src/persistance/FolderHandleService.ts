import { folderHandleDB } from './FolderHandlePersistance'

/**
 * Seule donnée de la bibliothèque de pistes gardée par le navigateur : le handle de
 * son dossier local. Il ne contient rien de la bibliothèque, seulement de quoi la rouvrir.
 */
const TRACKS_LIBRARY_KEY = 'tracks-library'

export async function DB_GetTracksLibraryHandle(): Promise<FileSystemDirectoryHandle | undefined> {
  return (await folderHandleDB().handles.get(TRACKS_LIBRARY_KEY))?.handle
}

export async function DB_SetTracksLibraryHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  await folderHandleDB().handles.put({ key: TRACKS_LIBRARY_KEY, handle })
}

export async function DB_ClearTracksLibraryHandle(): Promise<void> {
  await folderHandleDB().handles.delete(TRACKS_LIBRARY_KEY)
}
