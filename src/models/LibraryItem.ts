export type LibraryItemType = 'audio' | 'image';

export default abstract class LibraryItem {
  id?: number;
  name: string;
  file: File;
  playlistId?: number;
  order: number;
  createdAt: number;
  updatedAt: number;

  abstract readonly kind: LibraryItemType;

  protected constructor(file: File, name?: string) {
    this.file = file;
    this.name = name ?? file.name.replace(/\.[^/.]+$/, '');
    this.order = 0;
    this.createdAt = Date.now();
    this.updatedAt = this.createdAt;
  }

  rename(newName: string) {
    this.name = newName;
    this.touch();
  }

  touch() {
    this.updatedAt = Date.now();
  }
}
