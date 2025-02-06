import FileTrack from './FileTrack';

export default class Playlist {
  id?: number;
  name: string;
  tracks: FileTrack[];
  isEditing: boolean = false;

  constructor(name: string) {
    this.name = name;
    this.tracks = [];
  }
}
