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

      <div v-if="unsortedTrackFiles.length" class="clearfix">
        <LibraryTrack v-for="(trackFile, index) in unsortedTrackFiles"
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
      
      <!--<div class="bg-gray-800 p-4 rounded-lg">

        <h2 class="text-xl font-bold text-white mb-4">Playlists</h2>
           Zone de création d'une playlist par drag&drop 
        <div class="bg-gray-700 p-3 rounded mb-4 border-2 border-dashed border-gray-600 text-gray-300 text-center cursor-pointer"
           @dragover.prevent="onDragOverNewPlaylist"
           @drop.prevent="onDropNewPlaylist">
          Glisser un track ici pour créer une nouvelle playlist
        </div>
        Liste des playlists existantes 
        <Playlist v-for="(pl, index) in playlists"
                  :key="pl.id || index"
                  :playlist="pl"
                  @delete-playlist="removePlaylist"
                  @play="playTrack" />
      </div>-->

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
  import FileTrack from '@/models/FileTrack';
  import { DB_AddTrack, DB_RemoveTrack, DB_GetTracks } from '@/persistance/TrackService';
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
      Playlist: PlaylistComp
    },
    setup(props, { emit }) {
      const unsortedTrackFiles = ref<FileTrack[]>([]);
      const isListView = ref(true);

      const playlists = ref<Playlist[]>([]);

      onMounted(async () => {
        const loadedTracks = await DB_GetTracks();
        unsortedTrackFiles.value = loadedTracks;
      });

      async function addFile(newFile: File) {
        const ft = new FileTrack(newFile, newFile.name);
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

      /** Drag & drop sur la zone "new playlist" */
      function onDragOverNewPlaylist() {
        // Juste pour autoriser le drop
      }

      function onDropNewPlaylist(e: DragEvent) {
        if (!e.dataTransfer) return;
        const data = e.dataTransfer.getData('application/json');
        if (!data) return;
        const trackObj = JSON.parse(data) as FileTrack;

        // Créer une nouvelle playlist + y ajouter le track
        const newPl = new Playlist('Nouvelle playlist');
        newPl.id = Date.now(); // ou un GUID/ID auto
        newPl.tracks.push(trackObj);

        playlists.value.push(newPl);
      }

      /** Supprime la playlist si on clique sur "supprimer" ou si elle est vide */
      function removePlaylist(playlist: Playlist) {
        // Retirer la playlist du tableau
        const idx = playlists.value.indexOf(playlist);
        if (idx !== -1) {
          playlists.value.splice(idx, 1);
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
        onDragOverNewPlaylist,
        onDropNewPlaylist,
        removePlaylist
      };
    }
  });
</script>
