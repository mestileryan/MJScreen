import { ref, onMounted, watch } from 'vue'
import { DB_GetTrack } from '@/persistance/TrackService'
import type FileTrack from '@/models/FileTrack'

/**
 * Handle opening of tracks via an external link with `?trackId=` parameter
 * and coordinate between multiple tabs using a BroadcastChannel.
 *
 * @param handlePlay callback that enqueues the given track in the player
 */
export function useTrackLink(handlePlay: (track: FileTrack) => void) {
  // Toast message displayed at the top of the page
  const toastMessage = ref<string | null>(null)

  // Message displayed when another tab already hosts the application
  const externalMessage = ref<string | null>(null)

  // Communication channel used to talk between tabs of the application
  const broadcast = new BroadcastChannel('mjscreen')

  const state = ref<'active' | 'passive'>('active')

  const originalTitle = document.title

  watch(state, (newState) => {
    if (newState === 'passive') {
      document.title = `Inactif - ${originalTitle}`
    } else {
      document.title = originalTitle
    }
  })

  /** Display a short lived error message */
  function showToast(msg: string) {
    toastMessage.value = msg
    setTimeout(() => (toastMessage.value = null), 3000)
  }

  /**
   * Retrieve the track from IndexedDB and add it to the player.
   * If the track does not exist, show an error.
   */
  async function playTrackById(id: number) {
    const track = await DB_GetTrack(id)
    if (track) {
      handlePlay(track)
    } else {
      showToast('Musique introuvable')
    }
  }

  onMounted(() => {
    // When another tab asks to open a track, play it here and acknowledge
    broadcast.addEventListener('message', (e) => {
      if (state.value === 'passive') return

      if (e.data?.type === 'open-track') {
        playTrackById(Number(e.data.trackId))
        broadcast.postMessage({ type: 'ack' })
      } else if (e.data?.type === 'ping') {
        broadcast.postMessage({ type: 'ack' })
      }
    })

    const url = new URL(window.location.href)
    const param = url.searchParams.get('trackId')

    let ack = false
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'ack') {
        ack = true
      }
    }
    broadcast.addEventListener('message', handler)

    if (param) {
      const id = Number(param)
      broadcast.postMessage({ type: 'open-track', trackId: id })
      setTimeout(() => {
        broadcast.removeEventListener('message', handler)
        if (ack) {
          externalMessage.value = "La musique a été lancée sur votre page principale.<br>Vous pouvez fermer celle-ci."
          state.value = 'passive'
        } else {
          playTrackById(id)
        }
        url.searchParams.delete('trackId')
        window.history.replaceState({}, '', url.toString())
      }, 200)
    } else {
      broadcast.postMessage({ type: 'ping' })
      setTimeout(() => {
        broadcast.removeEventListener('message', handler)
        if (ack) {
          externalMessage.value = 'Vous avez déjà une page ouverte pour cette application.<br>Fermez celles en trop et recharger la page principale.'
          state.value = 'passive'
        }
      }, 200)
    }
  })

  return { toastMessage, externalMessage }
}
