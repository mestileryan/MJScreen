<template>
  <div className="min-h-screen bg-gray-900 flex">
    <div className="flex-1 p-8 overflow-auto">
      <h1 className="text-3xl font-bold text-purple-400 mb-8">MJ Screen</h1>
      <Uploader @file-selected="handleFileSelected" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <FilesList ref="filesList" @play="handlePlay" />
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
  import Uploader from './Uploader.vue';
  import FilesList from './FilesList.vue';
  import TracksPlayer from './TracksPlayer.vue';

  export default defineComponent({
    name: 'HelloWorld',
    components: {
      Uploader,
      FilesList,
      TracksPlayer,
    },
    setup() {
      const filesList = ref<InstanceType<typeof FilesList> | null>(null);
      const tracksPlayer = ref<InstanceType<typeof TracksPlayer> | null>(null);
      const autoPlayMode = ref(false);

      const handleFileSelected = (file: File) => {
        if (filesList.value) {
          filesList.value.addFile(file); // Ajoute le fichier à la liste
        }
      };

      const handlePlay = (file: File, volume: number) => {
        if (tracksPlayer.value) {
          tracksPlayer.value.addTrack(file, volume); // Passe les données au composant TracksPlayer
        }
      };

      return {
        filesList,
        tracksPlayer,
        autoPlayMode,
        handleFileSelected,
        handlePlay,
      };
    },
  });
</script>
