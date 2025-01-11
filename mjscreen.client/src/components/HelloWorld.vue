<template>
  <Uploader @file-selected="handleFileSelected" />
  <br />
  <!-- On référence le composant enfant FilesList -->
  <FilesList ref="filesList" @play="handlePlay" />

  <button @click="toggleAutoplay">Autoplay {{ autoPlayMode ? 'ON' : 'OFF'}}</button>
  <div v-for="track in tracks" :key="track.id">
    <Track :src="track.src" :autoPlay="track.autoPlay" @remove="removeTrack(track)" />
  </div>
</template>

<script lang="ts">
  import { defineComponent, ref } from 'vue';
  import Uploader from './Uploader.vue';
  import TrackComponent from './Track.vue';
  import FilesList from './FilesList.vue';
  import Track from '../models/Track'; // La classe Track

  export default defineComponent({
    name: 'HelloWorld',
    components: {
      Uploader,
      Track: TrackComponent,
      FilesList
    },
    setup() {
      const filesList = ref<InstanceType<typeof FilesList> | null>(null);
      const tracks = ref<Track[]>([]);
      const autoPlayMode = ref(false);

      /**
     * Handle file selection from Uploader
     */
      const handleFileSelected = (file: File) => {
        if (filesList.value) {
          filesList.value.addFiles(file); // Ajoute le fichier à la liste
        }
      };
      /**
     * Handle "play" event from FilesList
     */
      const handlePlay = (file: File) => {
        const track = new Track(file, autoPlayMode.value); // Crée une nouvelle instance de Track
        tracks.value.push(track); // Ajoute la piste à la liste

      };

      const removeTrack = (track: Track) => {
        // Supprime la piste de la liste
        tracks.value = tracks.value.filter((t) => t.id !== track.id);
        track.revokeUrl(); // Révoque l'URL Blob associée
      };
      const toggleAutoplay = () => {

        autoPlayMode.value = !autoPlayMode.value;
      };

      return {
        filesList,
        tracks,
        autoPlayMode,
        handleFileSelected,
        handlePlay,
        removeTrack,
        toggleAutoplay,
      };
    },
  });
</script>
