import { StorageError, type StorageErrorCode } from '../StorageProvider'
import type { TokenProvider } from './CloudStorage'

/**
 * `fetch` authentifié commun aux trois clouds : pose le jeton, traduit les
 * statuts HTTP en `StorageError` pour que l’interface réagisse sans connaître
 * le service.
 */
export async function cloudFetch(
  token: TokenProvider,
  fetchFn: typeof fetch,
  url: string,
  init: RequestInit & { path?: string } = {},
): Promise<Response> {
  const { path = '', headers, ...rest } = init
  const response = await fetchFn(url, {
    ...rest,
    headers: { ...(headers as Record<string, string>), Authorization: `Bearer ${await token()}` },
  })
  if (response.ok) return response
  throw await storageErrorFromResponse(response, path)
}

export async function storageErrorFromResponse(response: Response, path: string): Promise<StorageError> {
  const text = await response.text().catch(() => '')
  const code: StorageErrorCode =
    response.status === 404 ? 'not-found' : response.status === 401 || response.status === 403 ? 'permission-denied' : 'unknown'
  const message =
    code === 'not-found'
      ? `Introuvable : « ${path} ».`
      : code === 'permission-denied'
        ? 'Accès refusé par le service : reconnectez le compte.'
        : `Le service a répondu ${response.status}.`
  return new StorageError(code, path, message, { cause: text })
}
