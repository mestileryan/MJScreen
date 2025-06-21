import FileTrack from '../models/FileTrack';

export interface ITrackProvider {
  add(track: FileTrack): Promise<number>;
  update(track: FileTrack): Promise<void>;
  remove(track: FileTrack): Promise<void>;
  getAll(): Promise<FileTrack[]>;
}
