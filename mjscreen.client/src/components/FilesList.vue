<template>
  <div>
    <div v-if="trackFiles.length">
      <h3>Fichiers uploadés :</h3>
      <ul>
        <li v-for="(trackFile, index) in trackFiles" :key="index">
          {{ trackFile.file.name }} ({{ (trackFile.file.size / 1024 / 1024).toFixed(2) }} Mo)
          <input class="volume-slider"
                 type="range"
                 min="0"
                 max="1"
                 step="0.01"
                 v-model.number="trackFile.initialVolume" />
          <button @click="removeFile(index)">🗑️</button>
          <button @click="play(index)">▶️</button>

        </li>
      </ul>
    </div>
    <div v-else>
      <p>Aucun fichier pour le moment.</p>
    </div>
  </div>
</template>

<script lang="ts">
  import { defineComponent, ref } from 'vue';
  import FileTrack from '../models/FileTrack';

  export default defineComponent({
    name: 'FilesList',
    emits: ['play'], // Déclare l'événement "play"
    setup(_props, { expose, emit }) {
      const trackFiles = ref<FileTrack[]>([]);
      const volume = ref(1);

      function addFile(newFile: File) {
        trackFiles.value.push(new FileTrack(newFile));
      }

      function addFiles(newFiles: File | File[]) {
        if (!Array.isArray(newFiles)) {
          newFiles = [newFiles];
        }
        trackFiles.value = [
          ...trackFiles.value,
          ...newFiles.map(file => new FileTrack(file))
        ];
      }

      function removeFile(index: number) {
        trackFiles.value.splice(index, 1);
      }

      function clearFiles() {
        trackFiles.value = [];
      }

      /**
       * Joue un fichier et émet un événement "play" avec les informations du fichier
       */
      function play(index: number) {
        const trackFile = trackFiles.value[index];
        if (trackFile) {
          // Émet l'événement "play" avec le fichier comme payload
          emit('play', trackFile.file, trackFile.initialVolume);
        }
      }

      expose({
        addFile,
        addFiles,
        removeFile,
        clearFiles,
        play // On expose la méthode pour qu'elle soit accessible de l'extérieur
      });

      return {
        trackFiles,
        volume,
        addFile,
        addFiles,
        removeFile,
        clearFiles,
        play
      };
    }
  });
</script>

<style scoped>
  /* Styles éventuels */
</style>
