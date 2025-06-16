import FileTrack from './FileTrack';

export default class Track {
  id: number;
  src: string;
  autoPlay: boolean;
  volume: number;
  loop: boolean;
  name: string;
  fileTrack: FileTrack;

  constructor(fileTrack: FileTrack, autoPlay = false) {
    this.id = Date.now();
    this.src = URL.createObjectURL(fileTrack.file);
    this.autoPlay = autoPlay;
    this.volume = fileTrack.initialVolume;
    this.loop = fileTrack.loop;
    this.name = fileTrack.name;
    this.fileTrack = fileTrack;
  }

  revokeUrl() {
    // Révoque l'URL Blob associée à cette piste
    URL.revokeObjectURL(this.src);
  }
}
