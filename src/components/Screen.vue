<template>
  <div className="min-h-screen bg-gray-900 flex">
    <div className="flex-1 p-8 overflow-auto">
      <h1 className="text-3xl font-bold text-purple-400 mb-8">MJ Screen Jukebox</h1>

      <div>
        <Library ref="library" @play="handlePlay" />
      </div>
    </div>

    <div className="w-96 bg-gray-800 p-6 flex flex-col justify-start border-l border-gray-700">
      <TracksPlayer :autoPlayMode="autoPlayMode"
                    @update:autoplayMode="autoPlayMode = $event"
                    ref="tracksPlayer" />

    </div>
  </div>

</template>

<script lang="ts">
  import { defineComponent, ref } from 'vue';
  import Library from './Library.vue';
  import TracksPlayer from './TracksPlayer.vue';
  import FileTrack from '../models/FileTrack'

  export default defineComponent({
    name: 'Screen',
    components: {
      Library,
      TracksPlayer,
    },
    setup() {
      const library = ref<InstanceType<typeof Library> | null>(null);
      const tracksPlayer = ref<InstanceType<typeof TracksPlayer> | null>(null);
      const autoPlayMode = ref(false);

      const handlePlay = (track: FileTrack, volume: number) => {
        if (tracksPlayer.value) {
          tracksPlayer.value.addTrack(track.file, track.name, track.initialVolume); // Passe les données au composant TracksPlayer
        }
      };

      return {
        library,
        tracksPlayer,
        autoPlayMode,
        handlePlay,
      };
    },
  });
</script>
