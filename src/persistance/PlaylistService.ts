import { backendUrl } from '../models/BackendConfig';
import Playlist from '../models/Playlist';
import type { IPlaylistProvider } from './IPlaylistProvider';
import { DexiePlaylistProvider } from './DexiePlaylistProvider';
import { ApiPlaylistProvider } from './ApiPlaylistProvider';

function provider(): IPlaylistProvider {
  return backendUrl.value ? ApiPlaylistProvider : DexiePlaylistProvider;
}

export async function DB_AddPlaylist(pl: Playlist): Promise<number> {
  return provider().add(pl);
}
export async function DB_UpdatePlaylist(pl: Playlist): Promise<void> {
  return provider().update(pl);
}
export async function DB_RemovePlaylist(pl: Playlist): Promise<void> {
  return provider().remove(pl);
}
export async function DB_GetPlaylists(): Promise<Playlist[]> {
  return provider().getAll();
}
