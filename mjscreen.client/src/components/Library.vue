<template>
  <!--
    1) On importe DragOverlay
    2) On l'utilise pour envelopper tout ou partie de la bibliothèque
  -->
  <DragOverlay @files-dropped="handleFilesDropped">
    <div class="w-full bg-gray-800 rounded-lg p-4 pt-2">
      <div class="flex items-center">
        <h2 class="text-xl font-bold text-white mt-2 mb-2 mr-3">Bibliothèque</h2>
        <Uploader @file-selected="handleFileSelected" />
      </div>

      <div class="space-y-2" v-if="trackFiles.length">
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
        trackFiles.value.splice(index, 1);
        DB_RemoveTrack(track);
      }

      function playTrack(index: number) {
        const track = trackFiles.value[index];
        if (!track) return;
        emit('play', track);
      }

      // Quand l'utilisateur sélectionne un fichier via l'uploader
      function handleFileSelected(file: File) {
        addFile(file);
      }

      // Quand on dépose un fichier via DragOverlay
      function handleFilesDropped(files: File[]) {
        addFiles(files);
      }

      return {
        trackFiles,
        addFile,
        removeFile,
        playTrack,
        handleFileSelected,
        handleFilesDropped
      };
    }
  });
</script>
