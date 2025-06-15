<template>
  <div class="min-h-screen bg-gray-900 grid" :class="showFeaturePanel ? 'grid-cols-[1fr_24rem_24rem]' : 'grid-cols-[1fr_24rem]'">
    <div class="p-8 overflow-auto min-w-[522px]">
      <div class="flex items-center justify-between">
        <h1 class="text-3xl font-bold text-purple-400 mb-8">MJ Screen Jukebox</h1>
        <button @click="toggleFeaturePanel" class="text-sm text-purple-300 hover:underline ml-4">
          {{ showFeaturePanel ? 'Masquer' : 'Afficher' }} le panneau
        </button>
      </div>

      <div>
        <Library ref="library" @play="handlePlay" />
      </div>
    </div>

    <div class="w-96 bg-gray-800 p-6 flex flex-col justify-start border-l border-gray-700">
      <TracksPlayer ref="tracksPlayer" />
    </div>

    <div v-if="showFeaturePanel" class="w-96 bg-gray-700 p-6 flex flex-col justify-start border-l border-gray-700">
      <p class="text-purple-300 font-semibold mb-2">Nouveau panneau</p>
      <p class="text-gray-300">Placez ici votre future fonctionnalité.</p>
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

      const showFeaturePanel = ref(Cookies.get('showFeaturePanel') !== 'false');
      watch(showFeaturePanel, val => {
        Cookies.set('showFeaturePanel', val ? 'true' : 'false');
      });

      function toggleFeaturePanel() {
        showFeaturePanel.value = !showFeaturePanel.value;
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
        showFeaturePanel,
        toggleFeaturePanel,
      };
    },
  });
</script>
