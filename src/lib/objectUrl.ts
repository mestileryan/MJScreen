// Les modèles sont désormais des objets plats immuables : on ne peut plus mémoriser
// l'object URL sur l'instance comme le faisait `GalleryImage.ensureObjectUrl()`.
// Ce cache l'associe au `File` lui-même, ce qui évite d'en recréer un à chaque rendu.
const urls = new WeakMap<File | Blob, string>()

/** Retourne l'object URL du fichier, en le créant au premier appel. */
export function objectUrlFor(file: File | Blob): string {
  let url = urls.get(file)
  if (!url) {
    url = URL.createObjectURL(file)
    urls.set(file, url)
  }
  return url
}

/** Libère l'object URL associé au fichier, s'il en existe un. */
export function revokeObjectUrlFor(file: File | Blob): void {
  const url = urls.get(file)
  if (url) {
    URL.revokeObjectURL(url)
    urls.delete(file)
  }
}
