export default class FileTrack {
  id?: number;             // Identifiant pour IndexedDB
  file: File;
  initialVolume: number;
  name: string;
  iconName?: string; // <-- permet de stocker l'icône choisie

  constructor(file: File, name : string, initialVolume = 0.8) {
    this.file = file; // Génère un ID unique basé sur le timestamp
    this.initialVolume = initialVolume; // Crée une URL unique pour le fichier
    this.name = name;
    this.iconName = ''; // par défaut vide
  }
   
}
