import Dexie from 'dexie';
import type { Table } from 'dexie';
import type { ImageDB } from './ImageDB';

class ImageLibrary extends Dexie {
  images!: Table<ImageDB>;

  constructor() {
    super('ImageLibrary');
    this.version(1).stores({
      images: '++id,name,order'
    });
  }
}

export const ImageLibraryDB = new ImageLibrary();
