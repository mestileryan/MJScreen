import { describe, expect, it, vi } from 'vitest'
import { NotConnectedError, OAuthClient, pkceChallenge, type KeyValueStore, type OAuthConfig } from './oauth'

class MemoryStore implements KeyValueStore {
  private map = new Map<string, string>()
  getItem = (key: string) => this.map.get(key) ?? null
  setItem = (key: string, value: string) => void this.map.set(key, value)
  removeItem = (key: string) => void this.map.delete(key)
}

const codeConfig: OAuthConfig = {
  kind: 'dropbox',
  clientId: 'client-1',
  authorizeUrl: 'https://auth.example/authorize',
  tokenUrl: 'https://auth.example/token',
  scope: 'files',
  responseType: 'code',
  extraParams: { token_access_type: 'offline' },
}

const tokenConfig: OAuthConfig = {
  kind: 'google-drive',
  clientId: 'client-2',
  authorizeUrl: 'https://auth.example/authorize',
  scope: 'drive.file',
  responseType: 'token',
}

const REDIRECT = 'https://app.example/MJScreen/trackslibrary/'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

describe('pkceChallenge', () => {
  it('calcule le S256 attendu', async () => {
    expect(await pkceChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM')
  })
})

describe('OAuthClient (flux code + PKCE)', () => {
  it('construit l’URL d’autorisation et mémorise ce qu’on voulait faire', async () => {
    const store = new MemoryStore()
    const client = new OAuthClient(codeConfig, { store, redirectUri: REDIRECT })
    const url = new URL(await client.authorizationUrl({ action: 'connect' }))

    expect(url.origin + url.pathname).toBe('https://auth.example/authorize')
    expect(url.searchParams.get('client_id')).toBe('client-1')
    expect(url.searchParams.get('redirect_uri')).toBe(REDIRECT)
    expect(url.searchParams.get('response_type')).toBe('code')
    expect(url.searchParams.get('code_challenge_method')).toBe('S256')
    expect(url.searchParams.get('token_access_type')).toBe('offline')
    const state = url.searchParams.get('state')!
    expect(OAuthClient.pending(`${REDIRECT}?code=abc&state=${state}`, store)).toMatchObject({ kind: 'dropbox', context: { action: 'connect' } })
    expect(OAuthClient.pending(`${REDIRECT}?code=abc&state=autre`, store)).toBeNull()
    expect(client.connected()).toBe(false)
  })

  it('échange le code avec le verifier, puis fournit le jeton', async () => {
    const store = new MemoryStore()
    const fetchFn = vi.fn(async () => jsonResponse({ access_token: 'AT', refresh_token: 'RT', expires_in: 3600 }))
    const client = new OAuthClient(codeConfig, { store, redirectUri: REDIRECT, fetch: fetchFn, now: () => 1000 })
    const url = new URL(await client.authorizationUrl({ sourceId: 7 }))
    const challenge = url.searchParams.get('code_challenge')!

    const context = await client.complete(`${REDIRECT}?code=abc&state=${url.searchParams.get('state')}`)

    expect(context).toEqual({ sourceId: 7 })
    const [tokenUrl, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit]
    const body = init.body as URLSearchParams
    expect(tokenUrl).toBe('https://auth.example/token')
    expect(body.get('grant_type')).toBe('authorization_code')
    expect(body.get('code')).toBe('abc')
    expect(body.get('client_id')).toBe('client-1')
    expect(await pkceChallenge(body.get('code_verifier')!)).toBe(challenge)
    expect(client.connected()).toBe(true)
    expect(await client.token()).toBe('AT')
    expect(store.getItem('mjscreen.oauth.pending')).toBeNull()
  })

  it('rafraîchit un jeton sur le point d’expirer et garde l’ancien refresh token', async () => {
    const store = new MemoryStore()
    let now = 0
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ access_token: 'AT1', refresh_token: 'RT', expires_in: 100 }))
      .mockResolvedValueOnce(jsonResponse({ access_token: 'AT2', expires_in: 100 }))
    const client = new OAuthClient(codeConfig, { store, redirectUri: REDIRECT, fetch: fetchFn, now: () => now })
    const url = new URL(await client.authorizationUrl(null))
    await client.complete(`${REDIRECT}?code=abc&state=${url.searchParams.get('state')}`)

    now = 50_000
    expect(await client.token()).toBe('AT2')
    const body = (fetchFn.mock.calls[1] as unknown as [string, RequestInit])[1].body as URLSearchParams
    expect(body.get('grant_type')).toBe('refresh_token')
    expect(body.get('refresh_token')).toBe('RT')
    expect(JSON.parse(store.getItem('mjscreen.oauth.dropbox')!)).toMatchObject({ accessToken: 'AT2', refreshToken: 'RT' })
  })

  it('signale un refus du service et un compte non connecté', async () => {
    const store = new MemoryStore()
    const client = new OAuthClient(codeConfig, { store, redirectUri: REDIRECT })
    const url = new URL(await client.authorizationUrl(null))
    await expect(client.complete(`${REDIRECT}?error=access_denied&state=${url.searchParams.get('state')}`)).rejects.toThrow(/refusée/)
    await expect(client.token()).rejects.toBeInstanceOf(NotConnectedError)
  })
})

describe('OAuthClient (flux implicite)', () => {
  it('lit le jeton dans le fragment et se déconnecte à son expiration', async () => {
    const store = new MemoryStore()
    let now = 0
    const client = new OAuthClient(tokenConfig, { store, redirectUri: REDIRECT, now: () => now })
    const url = new URL(await client.authorizationUrl('ctx'))
    expect(url.searchParams.get('response_type')).toBe('token')
    expect(url.searchParams.has('code_challenge')).toBe(false)

    const context = await client.complete(`${REDIRECT}#access_token=AT&expires_in=3600&state=${url.searchParams.get('state')}`)
    expect(context).toBe('ctx')
    expect(await client.token()).toBe('AT')

    now = 3600_000
    await expect(client.token()).rejects.toBeInstanceOf(NotConnectedError)
    expect(client.connected()).toBe(false)
  })
})
