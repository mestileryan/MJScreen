import type TrackEffects from '@/models/TrackEffects';

export interface TrackDB {
  id?: number; // clé primaire auto-incrémentée
  name: string;
  initialVolume: number;
  /**
   * Contenu audio porté en propre. Absent quand la piste partage son fichier
   * avec ses doublons : il vit alors dans la table `blobs`, via `blobId`.
   */
  blob?: Blob;
  /** Référence vers `blobs`, posée à la première duplication de la piste. */
  blobId?: number;
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
  /**
   * Réglages avancés (fondus, latéralisation, hauteur, effets).
   * Champ non indexé lui aussi : absent tant que la piste reste neutre.
   */
  effects?: TrackEffects;
}


/**
 * Fichier audio partagé par plusieurs pistes (une piste et ses doublons).
 * Aucun compteur de références n'est stocké : on compte les pistes qui pointent
 * dessus au moment d'en supprimer une, ce qui ne peut pas se désynchroniser.
 */
export interface AudioBlobDB {
  id?: number;
  blob: Blob;
}
