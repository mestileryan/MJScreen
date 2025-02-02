<template>
  <div class="w-full bg-gray-800 rounded-lg p-4 pt-2">
    <ImportFileDragOverlay @files-dropped="handleFilesDropped">

      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center">
          <h2 class="text-xl font-bold text-white mr-2">Bibliothèque</h2>
          <Uploader @file-selected="handleFileSelected" />
        </div>
        <ViewModePlayerToggle v-model:isListView="isListView" />
      </div>
      <draggable v-if="unsortedTrackFiles.length"
                 v-model="unsortedTrackFiles"
                 group="tracks"
                 item-key="index"
                 class="clearfix"
                 @start="dragStart"
                 @end="saveNewOrder"
                 ghost-class="bg-gray-700">
        <template #item="{ element, index }">
          <div class="cursor-move">
            <LibraryTrack :trackFile="element"
                          :index="index"
                          :isListView="isListView"
                          @remove-file="removeFile"
                          @play="playTrack" />
            </div>
        </template>
      </draggable>
      <div v-else>
        <p class="text-gray-400 italic">Aucun fichier pour le moment.</p>
      </div>


    </ImportFileDragOverlay>
  </div>
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
  import draggable from 'vuedraggable';

  import { DB_AddTrack, DB_RemoveTrack, DB_UpdateTrack, DB_GetTracks } from '@/persistance/TrackService';
  import FileTrack from '@/models/FileTrack';
  import LibraryTrack from './LibraryTrack.vue';
  import Uploader from './Uploader.vue';
  import ImportFileDragOverlay from './ImportFileDragOverlay.vue';
  import ViewModePlayerToggle from './ViewModePlayerToggle.vue';
  import Playlist from '@/models/Playlist';
  import PlaylistComp from './Playlist.vue';

  export default defineComponent({
    name: 'Library',
    components: {
      LibraryTrack,
      Uploader,
      ImportFileDragOverlay,
      ViewModePlayerToggle,
      Playlist: PlaylistComp,
      draggable
    },
    setup(props, { emit }) {
      const unsortedTrackFiles = ref<FileTrack[]>([]);
      const isListView = ref(true);

      const playlists = ref<Playlist[]>([]);

      onMounted(async () => {
        const loadedTracks = await DB_GetTracks();
        unsortedTrackFiles.value = loadedTracks.sort((a, b) => a.order - b.order);

        for (const [index, track] of unsortedTrackFiles.value.entries()) {
          if (track.order !== index) {

            track.order = index; // Mise à jour de l'ordre
            await DB_UpdateTrack(track); // Sauvegarde en base
          }
          console.log(index + "-" + track.order)
        }
      });

      async function addFile(newFile: File) {
        const ft = new FileTrack(newFile, newFile.name);
        ft.order = unsortedTrackFiles.value.length;
        ft.id = await DB_AddTrack(ft);
        unsortedTrackFiles.value.push(ft);
      }

      async function addFiles(newFiles: File[]) {
        for (const file of newFiles) {
          await addFile(file);
        }
      }

      function removeFile(index: number) {
        const track = unsortedTrackFiles.value[index];
        unsortedTrackFiles.value.splice(index, 1);
        DB_RemoveTrack(track);
      }

      function playTrack(index: number) {
        const track = unsortedTrackFiles.value[index];
        if (!track) return;
        emit('play', track);
      }

      function handleFileSelected(file: File) {
        addFile(file);
      }

      function handleFilesDropped(files: File[]) {
        addFiles(files);
      }

      async function dragStart() {
        console.log("test4")
      }
      async function saveNewOrder() {

        for (const [index, track] of unsortedTrackFiles.value.entries()) {
          console.log(index + "-" + track.order)
          if (track.order !== index) {
            console.log("Updated track")

            track.order = index; // Mise à jour de l'ordre
            await DB_UpdateTrack(track); // Sauvegarde en base
          }
        }
      }
      return {
        unsortedTrackFiles,
        isListView,
        addFile,
        addFiles,
        removeFile,
        playTrack,
        handleFileSelected,
        handleFilesDropped,
        playlists,
        dragStart,
        saveNewOrder,
      };
    }
  });
</script>
