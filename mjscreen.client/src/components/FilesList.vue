<template>
  <div>
    <div v-if="files.length">
      <h3>Fichiers uploadés :</h3>
      <ul>
        <li v-for="(file, index) in files" :key="index">
          {{ file.name }} ({{ (file.size / 1024).toFixed(2) }} Ko)
          <button @click="removeFile(index)">X</button>
          <button @click="play(index)">Play</button>
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

  export default defineComponent({
    name: 'FilesList',
    emits: ['play'], // Déclare l'événement "play"
    setup(_props, { expose, emit }) {
      const files = ref<File[]>([]);

      function addFile(newFile: File) {
        files.value.push(newFile);
      }

      function addFiles(newFiles: File | File[]) {
        if (!Array.isArray(newFiles)) {
          newFiles = [newFiles];
        }
        files.value = [...files.value, ...newFiles];
      }

      function removeFile(index: number) {
        files.value.splice(index, 1);
      }

      function clearFiles() {
        files.value = [];
      }

      /**
       * Joue un fichier et émet un événement "play" avec les informations du fichier
       */
      function play(index: number) {
        const file = files.value[index];
        if (file) {
          // Émet l'événement "play" avec le fichier comme payload
          emit('play', file);
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
        files,
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
