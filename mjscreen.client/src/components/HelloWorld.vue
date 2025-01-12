<template>
  <Uploader @file-selected="handleFileSelected" />
  <br />
  <!-- On référence le composant enfant FilesList -->
  <FilesList ref="filesList" @play="handlePlay" />
  <TracksPlayer :autoPlayMode="autoPlayMode"
                @update:autoplayMode="autoPlayMode = $event"
                ref="tracksPlayer" />
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
          filesList.value.addFiles(file); // Ajoute le fichier à la liste
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
