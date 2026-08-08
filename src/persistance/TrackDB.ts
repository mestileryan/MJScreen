
export interface TrackDB {
  id?: number; // clé primaire auto-incrémentée
  name: string;
  initialVolume: number;
  blob: Blob;  // On stocke le contenu en blob (ou File)
  iconName?: string;
  iconColor?: string;
  order: number;
  playlistId?: number;
  loop?: boolean;
  /**
   * Crêtes de forme d'onde pré-calculées, quantifiées sur 8 bits (~2 Ko).
   * Champ non indexé : son ajout ne nécessite pas de montée de version Dexie.
   * Absent tant que la piste n'a jamais été décodée (backfill en arrière-plan).
   */
  peaks?: Uint8Array;
}

