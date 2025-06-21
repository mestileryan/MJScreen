import Playlist from '../models/Playlist';

export interface IPlaylistProvider {
  add(pl: Playlist): Promise<number>;
  update(pl: Playlist): Promise<void>;
  remove(pl: Playlist): Promise<void>;
  getAll(): Promise<Playlist[]>;
}
