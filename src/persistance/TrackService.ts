import { backendUrl } from '../models/BackendConfig';
import FileTrack from '../models/FileTrack';
import type { ITrackProvider } from './ITrackProvider';
import { DexieTrackProvider } from './DexieTrackProvider';
import { ApiTrackProvider } from './ApiTrackProvider';

function provider(): ITrackProvider {
  return backendUrl.value ? ApiTrackProvider : DexieTrackProvider;
}

export async function DB_AddTrack(t: FileTrack): Promise<number> {
  return provider().add(t);
}
export async function DB_UpdateTrack(t: FileTrack): Promise<void> {
  return provider().update(t);
}
export async function DB_RemoveTrack(t: FileTrack): Promise<void> {
  return provider().remove(t);
}
export async function DB_GetTracks(): Promise<FileTrack[]> {
  return provider().getAll();
}
