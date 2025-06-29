<template>
  <div class="min-h-screen bg-gray-900 grid" :class="isPlayerCollapsed ? 'grid-cols-[1fr_1.5rem]' : 'grid-cols-[1fr_24rem]'">
    <!-- Error notification for invalid track links -->
    <div v-if="toastMessage" class="fixed top-2 left-1/2 -translate-x-1/2 bg-red-600 text-white px-3 py-2 rounded z-50">
      {{ toastMessage }}
    </div>

    <!-- Inform the user that another tab already runs the application -->
    <div v-if="externalMessage" class="fixed inset-0 bg-black/70 flex items-center justify-center z-50" tabindex="0">
      <div class="bg-gray-800 p-6 rounded flex flex-col items-center gap-4">
        <p class="text-white text-center" v-html="externalMessage"/>
      </div>
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
  import { defineComponent, ref, watch } from 'vue';
  import Library from './Library.vue';
  import TracksPlayer from './TracksPlayer.vue';
  // Bouton ouvrant la modale d'import/export
  import SettingsModal from './SettingsModal.vue';
  // Barre latérale rétractable pour le lecteur
  import CollapsibleSidebar from './CollapsibleSidebar.vue';
  import FileTrack from '../models/FileTrack'
  import { Cookies } from '../models/Cookies';
  import { useTrackLink } from '@/composables/useTrackLink';

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

      // Add the selected track to the player queue
      const handlePlay = (track: FileTrack) => {
        if (tracksPlayer.value) {
          tracksPlayer.value.addTrack(track)
        }
      }

      // Register logic that handles ?trackId= links and inter-tab communication
      const { toastMessage, externalMessage } = useTrackLink(handlePlay)

      const isPlayerCollapsed = ref(Cookies.get('playerCollapsed') === 'true');
      watch(isPlayerCollapsed, val => {
        Cookies.set('playerCollapsed', val ? 'true' : 'false');
      });

      const handleOpenSettings = () => {
        showSettings.value = true
      }

      return {
        library,
        tracksPlayer,
        handlePlay,
        isPlayerCollapsed,
        handleOpenSettings,
        showSettings,
        toastMessage,
        externalMessage,
      };
    },
  });
</script>
