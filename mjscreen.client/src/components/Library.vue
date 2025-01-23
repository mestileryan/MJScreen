<template>
  <DragOverlay @files-dropped="handleFilesDropped">
    <div class="w-full bg-gray-800 rounded-lg p-4 pt-2">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center">
          <h2 class="text-xl font-bold text-white mr-2">Bibliothèque</h2>
          <Uploader @file-selected="handleFileSelected" />
        </div>
        <ViewModePlayerToggle v-model:isListView="isListView" />
      </div>

      <div v-if="trackFiles.length" class="clearfix">
        <LibraryTrack v-for="(trackFile, index) in trackFiles"
                      :key="index"
                      :trackFile="trackFile"
                      :index="index"
                      :isListView="isListView"
                      @remove-file="removeFile"
                      @play="playTrack" />
      </div>
      <div v-else>
        <p class="text-gray-400 italic">Aucun fichier pour le moment.</p>
      </div>
    </div>
  </DragOverlay>
</template>

<style scoped>
  .clearfix::after {
    content: "";
    display: table;
    clear: both;
  }
</style>

<script lang="ts">
  import { defineComponent, ref, onMounted } from 'vue';
  import FileTrack from '@/models/FileTrack';
  import { DB_AddTrack, DB_RemoveTrack, DB_GetTracks } from '@/persistance/TrackService';
  import LibraryTrack from './LibraryTrack.vue';
  import Uploader from './Uploader.vue';
  import DragOverlay from './DragOverlay.vue';
  import ViewModePlayerToggle from './ViewModePlayerToggle.vue';

  export default defineComponent({
    name: 'Library',
    components: {
      LibraryTrack,
      Uploader,
      DragOverlay,
      ViewModePlayerToggle
    },
    setup(props, { emit }) {
      const trackFiles = ref<FileTrack[]>([]);
      const isListView = ref(true);

      onMounted(async () => {
        const loadedTracks = await DB_GetTracks();
        trackFiles.value = loadedTracks;
      });

      function addFile(newFile: File) {
        const ft = new FileTrack(newFile, newFile.name);
        ft.id = DB_AddTrack(ft);
        trackFiles.value.push(ft);
      }

      function addFiles(newFiles: File[]) {
        newFiles.forEach(file => addFile(file));
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

      function handleFileSelected(file: File) {
        addFile(file);
      }

      function handleFilesDropped(files: File[]) {
        addFiles(files);
      }

      return {
        trackFiles,
        isListView,
        addFile,
        addFiles,
        removeFile,
        playTrack,
        handleFileSelected,
        handleFilesDropped
      };
    }
  });
</script>
