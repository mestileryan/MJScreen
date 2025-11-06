import LibraryItem from './LibraryItem';

export default class GalleryImage extends LibraryItem {
  readonly kind = 'image' as const;
  objectUrl?: string;

  constructor(file: File, name?: string) {
    super(file, name);
  }

  ensureObjectUrl(): string {
    if (!this.objectUrl) {
      this.objectUrl = URL.createObjectURL(this.file);
    }
    return this.objectUrl;
  }

  revokeObjectUrl() {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = undefined;
    }
  }
}
