import { imageLibraryDB } from './ImagePersistance'
import type { ImageDB } from './ImageDB'
import { createGalleryImage } from '@/models/GalleryImage'
import type GalleryImage from '@/models/GalleryImage'
import { revokeObjectUrlFor } from '@/lib/objectUrl'

export async function DB_AddImage(image: GalleryImage): Promise<number> {
  const stored: ImageDB = {
    name: image.name,
    blob: image.file,
    order: image.order,
    playlistId: image.playlistId ?? null,
    createdAt: image.createdAt,
    updatedAt: image.updatedAt,
  }

  return imageLibraryDB().images.add(stored)
}

export async function DB_UpdateImage(image: GalleryImage): Promise<void> {
  if (image.id == null) return

  await imageLibraryDB().images.update(image.id, {
    name: image.name,
    order: image.order,
    playlistId: image.playlistId ?? null,
    updatedAt: Date.now(),
  })
}

export async function DB_UpdateImages(images: GalleryImage[]): Promise<void> {
  await Promise.all(images.map(image => DB_UpdateImage(image)))
}

export async function DB_RemoveImage(image: GalleryImage): Promise<void> {
  if (image.id == null) return
  await imageLibraryDB().images.delete(image.id)
  revokeObjectUrlFor(image.file)
}

export async function DB_GetImages(): Promise<GalleryImage[]> {
  const storedImages = await imageLibraryDB().images.toArray()
  const images = storedImages.map(stored => {
    const file = new File([stored.blob], stored.name, { type: stored.blob.type })
    return {
      ...createGalleryImage(file, stored.name),
      id: stored.id,
      order: stored.order ?? 0,
      playlistId: stored.playlistId ?? undefined,
      createdAt: stored.createdAt ?? Date.now(),
      updatedAt: stored.updatedAt ?? Date.now(),
    }
  })

  return images.sort((a, b) => a.order - b.order)
}
