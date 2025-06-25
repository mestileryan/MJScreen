<template>
  <div class="min-h-screen bg-gray-900 grid" :class="isPlayerCollapsed ? 'grid-cols-[1fr_1.5rem]' : 'grid-cols-[1fr_24rem]'">
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

      const isPlayerCollapsed = ref(Cookies.get('playerCollapsed') === 'true');
      watch(isPlayerCollapsed, val => {
        Cookies.set('playerCollapsed', val ? 'true' : 'false');
      });

      const handlePlay = (track: FileTrack) => {
        if (tracksPlayer.value) {
          tracksPlayer.value.addTrack(track);
        }
      };

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
      };
    },
  });
</script>
