export default class Track {
  id: number;
  src: string;
  autoPlay: boolean;
  volume: number;
  loop: boolean;
  name: string;

  constructor(file: File, name: string, volume = 1, autoPlay = false) {
    this.id = Date.now(); // Génère un ID unique basé sur le timestamp
    this.src = URL.createObjectURL(file); // Crée une URL unique pour le fichier
    this.autoPlay = autoPlay;
    this.volume = volume;
    this.loop = false;
    this.name = name;
  }

  revokeUrl() {
    // Révoque l'URL Blob associée à cette piste
    URL.revokeObjectURL(this.src);
  }
}
