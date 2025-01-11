export default class Track {
  id: number;
  src: string;
  autoPlay: boolean;

  constructor(file: File, autoPlay = false) {
    this.id = Date.now(); // Génère un ID unique basé sur le timestamp
    this.src = URL.createObjectURL(file); // Crée une URL unique pour le fichier
    this.autoPlay = autoPlay;
  }

  revokeUrl() {
    // Révoque l'URL Blob associée à cette piste
    URL.revokeObjectURL(this.src);
  }
}
