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

    <div v-if="!isPlayerCollapsed" class="relative w-96 bg-gray-800 p-6 flex flex-col justify-start border-l border-gray-700">
      <button @click="togglePlayer" class="absolute right-2 top-2 text-purple-300 hover:text-purple-400">&gt;</button>
      <TracksPlayer ref="tracksPlayer" />
    </div>

    <div v-else class="flex items-start border-l border-gray-700 relative">
      <button @click="togglePlayer" class="text-purple-300 hover:text-purple-400 m-2">&lt;</button>
    </div>
  </div>
</template>

<script lang="ts">
  import { defineComponent, ref, watch } from 'vue';
  import Library from './Library.vue';
  import TracksPlayer from './TracksPlayer.vue';
  import FileTrack from '../models/FileTrack'
  import { Cookies } from '../models/Cookies';

  export default defineComponent({
    name: 'Screen',
    components: {
      Library,
      TracksPlayer,
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

      const handlePlay = (track: FileTrack, volume: number) => {
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
