import type { PlaylistMode } from '@/models/Playlist';

export interface PlaylistDB {
  id?: number; // clé primaire auto-incrémentée
  name: string;
  /** Largeur personnalisée en pixels pour le mode board */
  width?: number;
  /** Position de la playlist dans la bibliothèque */
  order?: number;
  /**
   * Mode de lecture (libre, enchainement, classique).
   * Champ non indexé : son ajout ne nécessite pas de montée de version Dexie.
   * Absent = libre, le comportement historique.
   */
  mode?: PlaylistMode;
  /** Fondus par défaut en secondes. Non indexés eux aussi ; absents = 0. */
  fadeIn?: number;
  fadeOut?: number;
}

