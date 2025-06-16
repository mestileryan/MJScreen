
export interface TrackDB {
  id?: number; // clé primaire auto-incrémentée
  name: string;
  initialVolume: number;
  blob: Blob;  // On stocke le contenu en blob (ou File)
  iconName?: string;
  order: number;
  playlistId?: number;
  loop?: boolean;
}

