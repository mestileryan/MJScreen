export default class GalleryImage {
  id?: number;
  name: string;
  file: File;
  order: number;
  objectUrl?: string;

  constructor(file: File, name?: string) {
    this.file = file;
    this.name = name ?? file.name;
    this.order = 0;
  }
}
