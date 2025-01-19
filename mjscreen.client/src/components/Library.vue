<template>
  <div class="w-full bg-gray-800 rounded-lg p-4">
    <h2 class="text-xl font-semibold text-white mb-4">Bibliothèque</h2>
    <div class="space-y-2" v-if="trackFiles.length">
      <ul>
        <li class="flex items-center justify-between p-3 rounded-lg bg-gray-700 hover:bg-gray-600m mb-1" v-for="(trackFile, index) in trackFiles" :key="index">
          <Music class="w-5 h-5 text-purple-400 mr-3" />


          <!--
    Zone d'affichage / édition du nom
  -->
          <div>
            <!-- Si on édite cette piste, on affiche un champ input -->
            <div v-if="editingIndex === index" class="flex items-center gap-2">
              <input type="text"
                     class="bg-gray-600 text-white p-1 rounded"
                     v-model="trackFile.name"
                     @keyup.enter="renameTrack(index)"
                     @blur="renameTrack(index)" />
            </div>

            <!-- Sinon, on affiche le nom actuel, avec un clic pour éditer -->
            <div v-else @click="enableEditing(index)">
              <p class="text-white font-medium" :title="trackFile.file.name">
                <!-- Si customName existe, on l’affiche, sinon on fallback sur le nom du File -->
                {{ trackFile.name }}
              </p>
              <p class="text-gray-400 text-sm">
                ({{ (trackFile.file.size / 1024 / 1024).toFixed(2) }} Mo)
              </p>
            </div>
          </div>

          <!-- Boutons actions -->
          <input class="volume-slider"
                 type="range"
                 min="0"
                 max="1"
                 step="0.01"
                 v-model.number="trackFile.initialVolume"
                 @change="handleVolumeChange(index)" />
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
  import { defineComponent, ref, onMounted } from 'vue';
  import FileTrack from '../models/FileTrack';
  import {
    DB_AddTrack,
    DB_RemoveTrack,
    DB_UpdateTrack,
    DB_GetTracks,
  } from '../persistance/TrackService';
  import * as lucide from 'lucide-vue-next'

  export default defineComponent({
    name: 'Library',
    emits: ['play'], // Déclare l'événement "play"
    setup(_props, { expose, emit }) {
      const trackFiles = ref<FileTrack[]>([]);
      const volume = ref(1);
      const editingIndex = ref<number | null>(null);

      onMounted(async () => {
        // On récupère les tracks depuis IndexedDB
        const loadedTracks = await DB_GetTracks();
        // On les stocke dans notre state local
        trackFiles.value = loadedTracks;
        console.log('Tracks chargés depuis la DB :', loadedTracks);
      });

      function addFile(newFile: File) {
        const ft = new FileTrack(newFile, newFile.name);
        ft.id = DB_AddTrack(ft);
        trackFiles.value.push(ft);
      }

      function addFiles(newFiles: File | File[]) {
        if (!Array.isArray(newFiles)) {
          newFiles = [newFiles];
        }
        trackFiles.value = [
          ...trackFiles.value,
          ...newFiles.map(file => {
            ft = new FileTrack(file, file.name);
            ft.id = DB_AddTrack(ft);
            return ft;
          })
        ];
        
      }

      function removeFile(index: number) {
        const track = trackFiles.value[index];
        // On retire localement
        trackFiles.value.splice(index, 1);
        // On retire côté DB
        DB_RemoveTrack(track);
      }

      function handleVolumeChange(index: number) {
        const track = trackFiles.value[index];
        // On enregistre la nouvelle valeur (déjà mise à jour par v-model)
        // dans Dexie :
        DB_UpdateTrack(track);
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
          emit('play', trackFile);
        }
      }
  
    /**
     * Active le mode édition pour le nom
     */
    function enableEditing(index: number) {
      editingIndex.value = index;
    }

    /**
     * Annule le mode édition (sans sauvegarder)
     */
    function cancelEditing() {
      editingIndex.value = null;
    }

    /**
     * Sauvegarde le nouveau nom en base et quitte le mode édition
     */
    async function renameTrack(index: number) {
      const track = trackFiles.value[index];
      // Sauvegarde en DB
      await DB_UpdateTrack(track);
      // Sortie du mode édition
      editingIndex.value = null;

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
        editingIndex,
        addFile,
        addFiles,
        removeFile,
        handleVolumeChange,
        clearFiles,
        play,
        enableEditing,
        renameTrack,
      };
    }
  });
</script>

<style scoped>
  /* Styles éventuels */
</style>
