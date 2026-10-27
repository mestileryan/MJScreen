/**
 * `fetch` factice pour les tests des clouds : chaque route répond selon la méthode
 * et l’URL, et tout appel est enregistré pour vérifier ce qui a été envoyé.
 */
export interface RecordedCall {
  method: string
  url: string
  headers: Record<string, string>
  body?: BodyInit | null
}

export type Route = (call: RecordedCall) => Response | Promise<Response>

export function json(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' }, ...init })
}

export function fakeFetch(routes: Record<string, Route>) {
  const calls: RecordedCall[] = []
  const fetchFn = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    const call: RecordedCall = {
      method: (init.method ?? 'GET').toUpperCase(),
      url,
      headers: Object.fromEntries(Object.entries((init.headers as Record<string, string>) ?? {})),
      body: init.body,
    }
    calls.push(call)
    // Le préfixe le plus long l’emporte : `…/children?page=2` ne retombe pas sur `…/children`.
    const key = Object.keys(routes)
      .filter(pattern => {
        const [method, prefix] = pattern.split(' ')
        return call.method === method && url.startsWith(prefix)
      })
      .sort((a, b) => b.length - a.length)[0]
    if (!key) return new Response(`route inconnue : ${call.method} ${url}`, { status: 599 })
    return routes[key](call)
  }) as typeof fetch
  return { fetchFn, calls }
}

export async function bodyText(body: BodyInit | null | undefined): Promise<string> {
  if (body == null) return ''
  if (typeof body === 'string') return body
  if (body instanceof Blob) return body.text()
  return String(body)
}
