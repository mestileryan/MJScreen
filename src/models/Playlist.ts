import FileTrack from './FileTrack';

export default class Playlist {
  id: number | null = null;
  name: string;
  tracks: FileTrack[];

  constructor(name: string) {
    this.name = name;
    this.tracks = [];
  }
}
