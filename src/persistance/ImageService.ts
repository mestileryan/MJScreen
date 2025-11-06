import { ImageLibraryDB } from './ImagePersistance';
import type { ImageDB } from './ImageDB';
import GalleryImage from '@/models/GalleryImage';

export async function DB_AddImage(image: GalleryImage): Promise<number> {
  const stored: ImageDB = {
    name: image.name,
    blob: image.file,
    order: image.order,
    playlistId: image.playlistId ?? null,
    createdAt: image.createdAt,
    updatedAt: image.updatedAt,
  };

  const newId = await ImageLibraryDB.images.add(stored);
  image.id = newId;
  return newId;
}

export async function DB_UpdateImage(image: GalleryImage): Promise<void> {
  if (image.id == null) return;

  image.touch();
  await ImageLibraryDB.images.update(image.id, {
    name: image.name,
    order: image.order,
    playlistId: image.playlistId ?? null,
    updatedAt: image.updatedAt,
  });
}

export async function DB_UpdateImages(images: GalleryImage[]): Promise<void> {
  await Promise.all(images.map(image => DB_UpdateImage(image)));
}

export async function DB_RemoveImage(image: GalleryImage): Promise<void> {
  if (image.id == null) return;
  await ImageLibraryDB.images.delete(image.id);
  image.revokeObjectUrl();
}

export async function DB_GetImages(): Promise<GalleryImage[]> {
  const storedImages = await ImageLibraryDB.images.toArray();
  const images = storedImages.map(stored => {
    const file = new File([stored.blob], stored.name, { type: stored.blob.type });
    const image = new GalleryImage(file, stored.name);
    image.id = stored.id;
    image.order = stored.order ?? 0;
    image.playlistId = stored.playlistId ?? undefined;
    if (stored.createdAt) image.createdAt = stored.createdAt;
    if (stored.updatedAt) image.updatedAt = stored.updatedAt;
    return image;
  });

  return images.sort((a, b) => a.order - b.order);
}
