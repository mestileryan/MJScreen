
export interface PlaylistDB {
  id?: number; // clé primaire auto-incrémentée
  name: string;
  /** Largeur personnalisée en pixels pour le mode board */
  width?: number;
  /** Position de la playlist dans la bibliothèque */
  order?: number;
}

