<template>
  <DragOverlay @files-dropped="handleFilesDropped">
    <div class="w-full bg-gray-800 rounded-lg p-4 pt-2">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center">
          <h2 class="text-xl font-bold text-white mr-2">Bibliothèque</h2>
          <Uploader @file-selected="handleFileSelected" />

        </div>

        <!-- Groupe arrondi -->
        <div class="inline-flex items-center bg-gray-700 p-1 rounded-full">
          <!-- Bouton "Liste" -->
          <button class="
            px-3 py-2
            rounded-l-full
            flex items-center justify-center
            transition-colors
          "
                  :class="isListView
            ? 'bg-purple-600 text-white'
            : 'text-gray-200 hover:bg-gray-600'"
                  @click="isListView = true">
            <List class="w-5 h-5" />
          </button>

          <!-- Bouton "Grille" -->
          <button class="
            px-3 py-2
            rounded-r-full
            flex items-center justify-center
            transition-colors
          "
            :class="!isListView
            ? 'bg-purple-600 text-white'
            : 'text-gray-200 hover:bg-gray-600'"
                  @click="isListView = false">
            <Grid3x3 class="w-5 h-5" />
          </button>
        </div>
      </div>

      <!-- 1) Mode Liste -->
      <div v-if="isListView">
        <div v-if="trackFiles.length" class="space-y-2">
          <ul>
            <LibraryTrack v-for="(trackFile, index) in trackFiles"
                          :key="index"
                          :trackFile="trackFile"
                          :index="index"
                          @remove-file="removeFile"
                          @play="playTrack" />
          </ul>
        </div>
        <div v-else>
          <p class="text-gray-400 italic">Aucun fichier pour le moment.</p>
        </div>
      </div>

      <!-- 2) Mode Launchpad (Grille) -->
      <div v-else>
        <!-- Grille de tuiles -->
        <div v-if="trackFiles.length" class="grid grid-cols-4 gap-4">
          <div v-for="(trackFile, index) in trackFiles"
               :key="index"
               class="bg-gray-700 text-white rounded flex items-center justify-center
                   h-16 cursor-pointer hover:bg-gray-600 transition-colors relative"
               @click="playTrack(index)"
               :title="trackFile.name">
            <!-- Icône "Music" (Font Awesome, Material Icons, etc.) -->
            <i class="fas fa-music text-lg"></i>
          </div>
        </div>
        <div v-else>
          <p class="text-gray-400 italic">Aucun fichier pour le moment.</p>
        </div>
      </div>
    </div>
  </DragOverlay>
</template>

<script lang="ts">
  import { defineComponent, ref, onMounted } from 'vue';
  import FileTrack from '@/models/FileTrack';
  import {
    DB_AddTrack,
    DB_RemoveTrack,
    DB_GetTracks
  } from '@/persistance/TrackService';
  import LibraryTrack from './LibraryTrack.vue';
  import Uploader from './Uploader.vue';
  import DragOverlay from './DragOverlay.vue';

  export default defineComponent({
    name: 'Library',
    components: {
      LibraryTrack,
      Uploader,
      DragOverlay
    },
    setup(props, { emit }) {
      const trackFiles = ref<FileTrack[]>([]);
      const isListView = ref(true); // Par défaut : mode liste

      onMounted(async () => {
        // Charger depuis la DB
        const loadedTracks = await DB_GetTracks();
        trackFiles.value = loadedTracks;
      });

      function addFile(newFile: File) {
        const ft = new FileTrack(newFile, newFile.name);
        ft.id = DB_AddTrack(ft);
        trackFiles.value.push(ft);
      }

      function addFiles(newFiles: File[]) {
        newFiles.forEach((file) => {
          const ft = new FileTrack(file, file.name);
          ft.id = DB_AddTrack(ft);
          trackFiles.value.push(ft);
        });
      }

      function removeFile(index: number) {
        const track = trackFiles.value[index];
        // Retirer de la liste
        trackFiles.value.splice(index, 1);
        // Retirer côté DB
        DB_RemoveTrack(track);
      }

      function playTrack(index: number) {
        const track = trackFiles.value[index];
        if (!track) return;
        emit('play', track);
      }

      function handleFileSelected(file: File) {
        addFile(file);
      }

      function handleFilesDropped(files: File[]) {
        addFiles(files);
      }

      /** Alterner entre mode liste et launchpad. */
      function toggleViewMode() {
        isListView.value = !isListView.value;
      }

      return {
        trackFiles,
        isListView,
        addFile,
        addFiles,
        removeFile,
        playTrack,
        handleFileSelected,
        handleFilesDropped,
        toggleViewMode
      };
    }
  });
</script>
