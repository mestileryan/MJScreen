<template>
  <div class="min-h-screen bg-gray-900 grid" :class="isPlayerCollapsed ? 'grid-cols-[1fr_1.5rem]' : 'grid-cols-[1fr_24rem]'">
    <div v-if="toastMessage" class="fixed top-2 left-1/2 -translate-x-1/2 bg-red-600 text-white px-3 py-2 rounded z-50">
      {{ toastMessage }}
    </div>
    <div class="p-8 overflow-auto min-w-[522px]">
      <div class="flex items-center justify-between">
        <h1 class="text-3xl font-bold text-purple-400 mb-8">MJ Screen Jukebox</h1>
      </div>

      <div>
        <Library ref="library" @play="handlePlay" />
      </div>
    </div>

    <CollapsibleSidebar v-model:collapsed="isPlayerCollapsed" @open-settings="handleOpenSettings">
      <TracksPlayer ref="tracksPlayer" />
    </CollapsibleSidebar>

    <SettingsModal
      :isOpen="showSettings"
      @close="showSettings = false" />

  </div>
</template>

<script lang="ts">
  import { defineComponent, ref, watch, onMounted } from 'vue';
  import Library from './Library.vue';
  import TracksPlayer from './TracksPlayer.vue';
  // Bouton ouvrant la modale d'import/export
  import SettingsModal from './SettingsModal.vue';
  // Barre latérale rétractable pour le lecteur
  import CollapsibleSidebar from './CollapsibleSidebar.vue';
  import FileTrack from '../models/FileTrack'
  import { Cookies } from '../models/Cookies';
  import { DB_GetTrack } from '@/persistance/TrackService';

  export default defineComponent({
    name: 'Screen',
    components: {
      Library,
      TracksPlayer,
      SettingsModal,
      CollapsibleSidebar,
    },
    setup() {
      const library = ref<InstanceType<typeof Library> | null>(null);
      const tracksPlayer = ref<InstanceType<typeof TracksPlayer> | null>(null);
      const showSettings = ref(false)
      const toastMessage = ref<string | null>(null)
      const broadcast = new BroadcastChannel('mjscreen')

      const isPlayerCollapsed = ref(Cookies.get('playerCollapsed') === 'true');
      watch(isPlayerCollapsed, val => {
        Cookies.set('playerCollapsed', val ? 'true' : 'false');
      });

      const handlePlay = (track: FileTrack) => {
        if (tracksPlayer.value) {
          tracksPlayer.value.addTrack(track);
        }
      };

      function showToast(msg: string) {
        toastMessage.value = msg
        setTimeout(() => (toastMessage.value = null), 3000)
      }

      async function playTrackById(id: number) {
        const track = await DB_GetTrack(id)
        if (track) {
          handlePlay(track)
        } else {
          showToast('Track introuvable')
        }
      }

      const handleOpenSettings = () => {
        showSettings.value = true
      }

      onMounted(() => {
        broadcast.addEventListener('message', (e) => {
          if (e.data?.type === 'open-track') {
            playTrackById(Number(e.data.trackId))
            broadcast.postMessage({ type: 'ack' })
            window.focus()
          }
        })

        const url = new URL(window.location.href)
        const param = url.searchParams.get('trackId')
        if (param) {
          const id = Number(param)
          let ack = false
          const handler = (e: MessageEvent) => {
            if (e.data?.type === 'ack') {
              ack = true
              broadcast.removeEventListener('message', handler)
              window.close()
            }
          }
          broadcast.addEventListener('message', handler)
          broadcast.postMessage({ type: 'open-track', trackId: id })
          setTimeout(() => {
            broadcast.removeEventListener('message', handler)
            if (!ack) {
              playTrackById(id)
            }
            url.searchParams.delete('trackId')
            window.history.replaceState({}, '', url.toString())
          }, 200)
        }
      })

      return {
        library,
        tracksPlayer,
        handlePlay,
        isPlayerCollapsed,
        handleOpenSettings,
        showSettings,
        toastMessage,
      };
    },
  });
</script>
