export interface ImageDB {
  id?: number;
  name: string;
  blob: Blob;
  order: number;
  playlistId?: number | null;
  createdAt?: number;
  updatedAt?: number;
}
