import Playlist from '../models/Playlist';
import { backendUrl } from '../models/BackendConfig';
import type { IPlaylistProvider } from './IPlaylistProvider';

export const ApiPlaylistProvider: IPlaylistProvider = {
  async add(pl: Playlist): Promise<number> {
    const res = await fetch(`${backendUrl.value}/api/playlists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: pl.name, width: pl.width })
    });
    const data = await res.json();
    pl.id = data.id;
    return data.id;
  },

  async update(pl: Playlist): Promise<void> {
    if (pl.id == null) return;
    await fetch(`${backendUrl.value}/api/playlists/${pl.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: pl.name, width: pl.width })
    });
  },

  async remove(pl: Playlist): Promise<void> {
    if (pl.id == null) return;
    await fetch(`${backendUrl.value}/api/playlists/${pl.id}`, { method: 'DELETE' });
  },

  async getAll(): Promise<Playlist[]> {
    const res = await fetch(`${backendUrl.value}/api/playlists`);
    const items: Playlist[] = [];
    if (res.ok) {
      const arr = await res.json();
      for (const it of arr) {
        const pl = new Playlist(it.name);
        pl.id = it.id;
        pl.width = it.width ?? undefined;
        items.push(pl);
      }
    }
    return items;
  }
};
