import { ImageLibraryDB } from './ImagePersistance';
import type { ImageDB } from './ImageDB';
import GalleryImage from '@/models/GalleryImage';

export async function DB_AddImage(image: GalleryImage): Promise<number> {
  const stored: ImageDB = {
    name: image.name,
    blob: image.file,
    order: image.order,
  };

  const newId = await ImageLibraryDB.images.add(stored);
  image.id = newId;
  return newId;
}

export async function DB_UpdateImage(image: GalleryImage): Promise<void> {
  if (image.id == null) return;

  await ImageLibraryDB.images.update(image.id, {
    name: image.name,
    order: image.order,
  });
}

export async function DB_UpdateImages(images: GalleryImage[]): Promise<void> {
  await Promise.all(images.map(image => DB_UpdateImage(image)));
}

export async function DB_RemoveImage(image: GalleryImage): Promise<void> {
  if (image.id == null) return;
  await ImageLibraryDB.images.delete(image.id);
}

export async function DB_GetImages(): Promise<GalleryImage[]> {
  const storedImages = await ImageLibraryDB.images.toArray();
  const images = storedImages.map(stored => {
    const file = new File([stored.blob], stored.name, { type: stored.blob.type });
    const image = new GalleryImage(file, stored.name);
    image.id = stored.id;
    image.order = stored.order ?? 0;
    return image;
  });

  return images.sort((a, b) => a.order - b.order);
}
