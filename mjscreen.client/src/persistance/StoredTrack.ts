

// Définition du type qu'on stocke en BDD
export interface StoredTrack {
  id?: number; // clé primaire auto-incrémentée
  name: string;
  initialVolume: Number;
  blob: Blob;  // On stocke le contenu en blob (ou File)
}

