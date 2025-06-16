import FileTrack from './FileTrack';

export default class Playlist {
  id?: number;
  name: string;
  /**
   * Custom width in pixels when displayed in board mode.
   * If undefined, playlist takes full available width.
   */
  width?: number;
  tracks: FileTrack[];
  isEditing: boolean = false;

  constructor(name: string) {
    this.name = name;
    this.tracks = [];
  }
}
