import { MemoryStorageProvider } from '../MemoryStorageProvider'
import type { CloudAccount, CloudKind, CloudQuota, CloudStorage } from './CloudStorage'
import { CLOUD_LABELS } from './CloudStorage'

/**
 * Cloud simulé, pour développer et tester l’interface sans identifiants OAuth :
 * un stockage en mémoire avec un compte et un quota inventés. Son contenu ne
 * survit pas au rechargement de la page.
 */
export class MockCloudStorage extends MemoryStorageProvider implements CloudStorage {
  readonly kind: CloudKind
  private readonly total: number

  constructor(kind: CloudKind, initial: Record<string, string | Blob> = {}, total = 2_000_000_000) {
    super(`${CLOUD_LABELS[kind]} (démo)`, initial)
    this.kind = kind
    this.total = total
  }

  async account(): Promise<CloudAccount> {
    return { id: `demo-${this.kind}`, label: `demo@${this.kind.replace('-', '')}.exemple` }
  }

  async quota(): Promise<CloudQuota> {
    let used = 1_234_567_890
    for (const entry of await this.list('', { recursive: true })) used += entry.size ?? 0
    return { used, total: this.total }
  }
}

// Une seule instance par service le temps de la session : brancher puis rouvrir
// la source retombe sur le même contenu.
const instances = new Map<CloudKind, MockCloudStorage>()

export function mockCloudStorage(kind: CloudKind): MockCloudStorage {
  let instance = instances.get(kind)
  if (!instance) {
    instance = new MockCloudStorage(kind, {
      'Taverne du dragon.mp3': 'démo',
      'ambiances/Pluie sur les tuiles.ogg': 'démo',
    })
    instances.set(kind, instance)
  }
  return instance
}
