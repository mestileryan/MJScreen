
export interface PlaylistDB {
  id?: number; // clé primaire auto-incrémentée
  name: string;
  /** Largeur personnalisée en pixels pour le mode board */
  width?: number;
}

