/**
 * Empreinte SHA-256 d’un fichier, en hexadécimal. Deux fichiers au contenu
 * identique ont la même empreinte, quel que soit leur nom ou leur emplacement :
 * c’est ainsi que les doublons sont repérés d’une source à l’autre.
 */
export async function sha256Hex(blob: Blob): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer())
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')
}
