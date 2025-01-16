export default class FileTrack {
  id?: number;             // Identifiant pour IndexedDB
  file: File;
  initialVolume: number;

  constructor(file: File, initialVolume = 0.8) {
    this.file = file; // Génère un ID unique basé sur le timestamp
    this.initialVolume = initialVolume; // Crée une URL unique pour le fichier
  }

}
