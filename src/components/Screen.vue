<template>
  <div class="min-h-screen bg-gray-900 grid" :class="isPlayerCollapsed ? 'grid-cols-[1fr_1.5rem]' : 'grid-cols-[1fr_24rem]'">
    <div class="p-8 overflow-auto min-w-[522px]">
      <div class="flex items-center justify-between">
        <h1 class="text-3xl font-bold text-purple-400 mb-8">MJ Screen Jukebox</h1>
      </div>

      <div>
        <Library ref="library" @play="handlePlay" />
        <NotesPanel class="mt-6" @play="handlePlay" />
      </div>
    </div>

    <div v-if="!isPlayerCollapsed" class="w-96 bg-gray-800 p-6 flex flex-col justify-start border-l border-gray-700 relative">
      <button @click="togglePlayer"
              class="absolute -left-3 top-2 rounded-full p-1 text-purple-300 hover:text-purple-400 hover:bg-gray-700 transition-colors bg-gray-800 border border-gray-600 shadow-md">
        <ChevronRight class="w-4 h-4" />
      </button>

      <TracksPlayer ref="tracksPlayer" />
    </div>

    <div v-else class="relative w-6 flex items-center justify-center border-l border-gray-700">
      <button @click="togglePlayer"
              class="absolute -left-3 top-2 rounded-full p-1 text-purple-300 hover:text-purple-400 hover:bg-gray-700 transition-colors bg-gray-800 border border-gray-600 shadow-md">
        <ChevronLeft class="w-4 h-4" />
      </button>
    </div>
  </div>
</template>

<script lang="ts">
  import { defineComponent, ref, watch } from 'vue';
  import Library from './Library.vue';
  import TracksPlayer from './TracksPlayer.vue';
  import NotesPanel from './NotesPanel.vue';
  import FileTrack from '../models/FileTrack'
  import { Cookies } from '../models/Cookies';

  export default defineComponent({
    name: 'Screen',
    components: {
      Library,
      TracksPlayer,
      NotesPanel,
    },
    setup() {
      const library = ref<InstanceType<typeof Library> | null>(null);
      const tracksPlayer = ref<InstanceType<typeof TracksPlayer> | null>(null);

      const isPlayerCollapsed = ref(Cookies.get('playerCollapsed') === 'true');
      watch(isPlayerCollapsed, val => {
        Cookies.set('playerCollapsed', val ? 'true' : 'false');
      });

      function togglePlayer() {
        isPlayerCollapsed.value = !isPlayerCollapsed.value;
      }

      const handlePlay = (track: FileTrack) => {
        if (tracksPlayer.value) {
          tracksPlayer.value.addTrack(track.file, track.name, track.initialVolume);
        }
      };

      return {
        library,
        tracksPlayer,
        handlePlay,
        isPlayerCollapsed,
        togglePlayer,
      };
    },
  });
</script>
