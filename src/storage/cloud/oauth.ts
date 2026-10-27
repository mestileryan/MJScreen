import type { CloudKind } from './CloudStorage'

/**
 * Connexion OAuth 2 depuis le navigateur, sans secret : flux « code » avec PKCE
 * (Dropbox, OneDrive), ou flux « token » implicite quand le service n’accepte pas
 * PKCE pour une page web sans secret (Google). Les jetons vivent en `sessionStorage` :
 * ils disparaissent avec l’onglet, et ne contiennent rien de la bibliothèque.
 */

export interface OAuthConfig {
  kind: CloudKind
  clientId: string
  authorizeUrl: string
  /** Absent pour le flux implicite, qui n’échange rien. */
  tokenUrl?: string
  scope: string
  responseType: 'code' | 'token'
  /** Paramètres propres au service (accès hors ligne, consentement…). */
  extraParams?: Record<string, string>
}

export interface OAuthTokens {
  accessToken: string
  refreshToken?: string
  /** Date d’expiration en millisecondes, absente si le service ne la donne pas. */
  expiresAt?: number
}

/** Ce que l’on voulait faire avant d’être redirigé : repris au retour. */
export interface PendingAuthorization<C = unknown> {
  kind: CloudKind
  state: string
  verifier?: string
  context: C
}

/** Sous-ensemble de `Storage` : injectable dans les tests, où `sessionStorage` n’existe pas. */
export interface KeyValueStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export class NotConnectedError extends Error {
  constructor(kind: CloudKind) {
    super(`Compte ${kind} non connecté.`)
    this.name = 'NotConnectedError'
  }
}

const PENDING_KEY = 'mjscreen.oauth.pending'
const tokensKey = (kind: CloudKind) => `mjscreen.oauth.${kind}`

function randomString(bytes = 32): string {
  return base64Url(crypto.getRandomValues(new Uint8Array(bytes)))
}

function base64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** Empreinte S256 du code verifier, telle que PKCE la demande. */
export async function pkceChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return base64Url(new Uint8Array(digest))
}

interface OAuthClientOptions {
  store: KeyValueStore
  redirectUri: string
  fetch?: typeof fetch
  now?: () => number
}

export class OAuthClient {
  readonly config: OAuthConfig
  private readonly store: KeyValueStore
  private readonly redirectUri: string
  private readonly fetchFn: typeof fetch
  private readonly now: () => number

  constructor(config: OAuthConfig, options: OAuthClientOptions) {
    this.config = config
    this.store = options.store
    this.redirectUri = options.redirectUri
    this.fetchFn = options.fetch ?? fetch
    this.now = options.now ?? Date.now
  }

  /**
   * Prépare la redirection vers le service : mémorise ce qu’on voulait faire et
   * retourne l’URL à ouvrir. L’appelant fait `location.assign(url)`.
   */
  async authorizationUrl<C>(context: C): Promise<string> {
    const state = randomString(16)
    const pending: PendingAuthorization<C> = { kind: this.config.kind, state, context }
    const url = new URL(this.config.authorizeUrl)
    url.searchParams.set('client_id', this.config.clientId)
    url.searchParams.set('redirect_uri', this.redirectUri)
    url.searchParams.set('response_type', this.config.responseType)
    url.searchParams.set('scope', this.config.scope)
    url.searchParams.set('state', state)
    if (this.config.responseType === 'code') {
      pending.verifier = randomString(48)
      url.searchParams.set('code_challenge', await pkceChallenge(pending.verifier))
      url.searchParams.set('code_challenge_method', 'S256')
    }
    for (const [key, value] of Object.entries(this.config.extraParams ?? {})) url.searchParams.set(key, value)
    this.store.setItem(PENDING_KEY, JSON.stringify(pending))
    return url.toString()
  }

  /** Lit la redirection de retour. `null` si l’URL n’en est pas une, ou si elle ne nous concerne pas. */
  static pending(url: string, store: KeyValueStore): PendingAuthorization | null {
    const raw = store.getItem(PENDING_KEY)
    if (!raw) return null
    const pending = JSON.parse(raw) as PendingAuthorization
    const { search, hash } = new URL(url)
    const params = new URLSearchParams(search)
    const fragment = new URLSearchParams(hash.replace(/^#/, ''))
    const state = params.get('state') ?? fragment.get('state')
    return state === pending.state ? pending : null
  }

  /**
   * Termine la connexion au retour du service : échange le code contre des jetons
   * (ou lit le jeton du fragment), et retourne le contexte mémorisé au départ.
   */
  async complete<C>(url: string): Promise<C> {
    const pending = OAuthClient.pending(url, this.store) as PendingAuthorization<C> | null
    if (!pending || pending.kind !== this.config.kind) throw new Error('Retour OAuth inattendu.')
    this.store.removeItem(PENDING_KEY)

    const { search, hash } = new URL(url)
    const params = new URLSearchParams(search)
    const fragment = new URLSearchParams(hash.replace(/^#/, ''))
    const error = params.get('error') ?? fragment.get('error')
    if (error) throw new Error(`Connexion refusée par le service (${error}).`)

    if (this.config.responseType === 'token') {
      const accessToken = fragment.get('access_token')
      if (!accessToken) throw new Error('Jeton absent de la réponse du service.')
      const expiresIn = Number(fragment.get('expires_in'))
      this.saveTokens({ accessToken, expiresAt: expiresIn ? this.now() + expiresIn * 1000 : undefined })
      return pending.context
    }

    const code = params.get('code')
    if (!code) throw new Error('Code absent de la réponse du service.')
    await this.exchange({
      grant_type: 'authorization_code',
      code,
      code_verifier: pending.verifier ?? '',
      redirect_uri: this.redirectUri,
    })
    return pending.context
  }

  connected(): boolean {
    return this.tokens() !== null
  }

  /** Jeton d’accès valide : rafraîchi s’il expire dans moins d’une minute et qu’on le peut. */
  async token(): Promise<string> {
    const tokens = this.tokens()
    if (!tokens) throw new NotConnectedError(this.config.kind)
    const expiring = tokens.expiresAt !== undefined && tokens.expiresAt - this.now() < 60_000
    if (!expiring) return tokens.accessToken
    if (!tokens.refreshToken) {
      this.signOut()
      throw new NotConnectedError(this.config.kind)
    }
    const refreshed = await this.exchange({ grant_type: 'refresh_token', refresh_token: tokens.refreshToken })
    return refreshed.accessToken
  }

  signOut(): void {
    this.store.removeItem(tokensKey(this.config.kind))
  }

  private tokens(): OAuthTokens | null {
    const raw = this.store.getItem(tokensKey(this.config.kind))
    return raw ? (JSON.parse(raw) as OAuthTokens) : null
  }

  private saveTokens(tokens: OAuthTokens) {
    this.store.setItem(tokensKey(this.config.kind), JSON.stringify(tokens))
  }

  private async exchange(params: Record<string, string>): Promise<OAuthTokens> {
    if (!this.config.tokenUrl) throw new Error('Ce service n’échange pas de code.')
    const body = new URLSearchParams({ client_id: this.config.clientId, ...params })
    const response = await this.fetchFn(this.config.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })
    if (!response.ok) {
      this.signOut()
      throw new Error(`Le service a refusé la connexion (${response.status}).`)
    }
    const json = (await response.json()) as { access_token: string; refresh_token?: string; expires_in?: number }
    const previous = this.tokens()
    const tokens: OAuthTokens = {
      accessToken: json.access_token,
      // Un rafraîchissement ne renvoie pas toujours un nouveau refresh token : on garde l’ancien.
      refreshToken: json.refresh_token ?? previous?.refreshToken,
      expiresAt: json.expires_in ? this.now() + json.expires_in * 1000 : undefined,
    }
    this.saveTokens(tokens)
    return tokens
  }
}
