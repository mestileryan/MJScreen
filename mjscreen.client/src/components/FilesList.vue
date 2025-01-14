<template>
  <div class="w-full max-w-2xl bg-gray-800 rounded-lg p-4">
    <h2 class="text-xl font-semibold text-white mb-4">Bibliothèque</h2>
    <div class="space-y-2" v-if="trackFiles.length">
      <ul>
        <li class="flex items-center justify-between p-3 rounded-lg bg-gray-700 hover:bg-gray-600" v-for="(trackFile, index) in trackFiles" :key="index">
          <Music class="w-5 h-5 text-purple-400 mr-3" />
          <div>
            <p class="text-white font-medium">
              {{ trackFile.file.name }}
            </p>
            <p class="text-gray-400 text-sm">
              ({{ (trackFile.file.size / 1024 / 1024).toFixed(2) }} Mo)
            </p>
          </div>
          <input class="volume-slider"
                 type="range"
                 min="0"
                 max="1"
                 step="0.01"
                 v-model.number="trackFile.initialVolume" />
          <div class="flex items-center gap-1 ml-2">
            <button class="p-2 rounded-full hover:bg-green-400/20 transition-colors" @click="play(index)">
              <Play class="w-5 h-5 text-green-400" />
            </button>
            <button @click="removeFile(index)" class="p-2 hover:bg-red-700/20 rounded-full transition-colors">
              <Trash2 class="w-5 h-5 text-red-400" />
            </button>
          </div>

        </li>
      </ul>
    </div>
    <div v-else>
      <p class="text-gray-400 italic">Aucun fichier pour le moment.</p>
    </div>
  </div>
</template>

<script lang="ts">
  import { defineComponent, ref } from 'vue';
  import FileTrack from '../models/FileTrack';
  import saveTrackToDB from '../persistance/SaveTrackService'
  import * as lucide from 'lucide-vue-next'

  export default defineComponent({
    name: 'FilesList',
    emits: ['play'], // Déclare l'événement "play"
    setup(_props, { expose, emit }) {
      const trackFiles = ref<FileTrack[]>([]);
      const volume = ref(1);

      function addFile(newFile: File) {
        const ft = new FileTrack(newFile);
        trackFiles.value.push(ft);

        // Sauvegarde immédiatement dans Dexie
        // const id = await saveTrackToDB(ft); // TODO
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
