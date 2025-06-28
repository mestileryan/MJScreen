import { ref, onMounted } from 'vue'
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

  // Communication channel used to talk between tabs of the application
  const broadcast = new BroadcastChannel('mjscreen')

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
      showToast('Track introuvable')
    }
  }

  onMounted(() => {
    // When another tab asks to open a track, play it here and acknowledge
    broadcast.addEventListener('message', (e) => {
      if (e.data?.type === 'open-track') {
        playTrackById(Number(e.data.trackId))
        // Notify the opener so it can close itself as soon as possible
        broadcast.postMessage({ type: 'ack' })
        // Ensure this tab gets focus
        window.focus()
      }
    })

    // If this tab was opened from an external link with ?trackId=xxx
    const url = new URL(window.location.href)
    const param = url.searchParams.get('trackId')
    if (!param) return

    const id = Number(param)
    let ack = false
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'ack') {
        ack = true
        broadcast.removeEventListener('message', handler)
        // Close this temporary tab as soon as the other one confirms reception
        window.close()
      }
    }
    broadcast.addEventListener('message', handler)
    // Ask any existing tab to play the track
    broadcast.postMessage({ type: 'open-track', trackId: id })
    setTimeout(() => {
      broadcast.removeEventListener('message', handler)
      // If no acknowledgement was received, play the track ourselves
      if (!ack) {
        playTrackById(id)
      }
      // Clean up the URL so refreshing the page doesn't repeat the action
      url.searchParams.delete('trackId')
      window.history.replaceState({}, '', url.toString())
    }, 200)
  })

  return { toastMessage }
}
