export default class FileTrack {
  id?: number;             // Identifiant pour IndexedDB
  file: File;
  initialVolume: number;
  name: string;
  iconName?: string; // <-- permet de stocker l'icône choisie
  /** Couleur personnalisée de l'icône */
  iconColor?: string;
  order: number;           // <-- Ajout de l'ordre des tracks
  playlistId?: number;
  /** Etat boucle par defaut lors de la lecture */
  loop: boolean;

  constructor(file: File, name: string) {
    this.file = file; // Génère un ID unique basé sur le timestamp
    this.initialVolume = 0.8; // Crée une URL unique pour le fichier
    this.name = name;
    this.iconName = ''; // par défaut vide
    this.iconColor = '#c084fc';
    this.order = 0;
    this.loop = false;
  }
}
