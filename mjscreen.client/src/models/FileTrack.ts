export default class FileTrack {
  file: File;
  initialVolume: Number;

  constructor(file: File, initialVolume = 0.8) {
    this.file = file; // Génère un ID unique basé sur le timestamp
    this.initialVolume = initialVolume; // Crée une URL unique pour le fichier
  }

}
