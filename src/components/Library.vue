<template>
  <div class="w-full bg-gray-800 rounded-lg p-4 pt-2">
    <ImportFileDragOverlay @files-dropped="handleFilesDropped">

      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center">
          <h2 class="text-xl font-bold text-purple-300 mr-2">Bibliothèque</h2>
          <Uploader @file-selected="handleFileSelected" />
        </div>
        <ViewModePlayerToggle v-model:isListView="isListView" />
      </div>
      <draggable v-if="unsortedTrackFiles.length"
                 v-model="unsortedTrackFiles"
                 group="tracks"
                 item-key="index"
                 class="clearfix"
                 @change="updateTrackOrder($event, undefined)"
                 ghost-class="bg-gray-700">
        <template #item="{ element, index }">
          <div class="cursor-move">
            <LibraryTrack :trackFile="element"
                          :isListView="isListView"
                          @remove-file="removeFile"
                          @play="playTrack" />
          </div>
        </template>
      </draggable>
      <div v-else>
        <p class="text-gray-400 italic">Aucun fichier dans la bibliothèque !</p>
      </div>

      <hr class="h-px my-6 bg-purple-800 border-0 dark:bg-gray-700" />
      <div class="flex items-center">
        <!-- Playlists -->
        <h2 class="text-xl font-bold text-purple-300 mr-2">Playlists</h2>


        <!-- Bouton + pour ajouter une playlist -->
        <div class="w-8 cursor-pointer bg-purple-500 hover:bg-purple-600 px-2 py-1
            rounded-lg flex items-center gap-2 transition-colors justify-center"
             @click="addPlaylist" >
          <Plus class="text-2xl" />
        </div>
      </div>

      <!-- Liste des playlists dynamiques -->
      <div>
        <div v-for="(playlist, pIndex) in playlists" :key="playlist.id"
              class="bg-gray-700/25 p-3 rounded mt-1 mb-1">
          <div class="flex justify-between items-center">

            <!--<h4 class="text-white font-semibold mb-2">{{ playlist.name }}</h4>-->

            <div class="flex-1">
              <p v-if="!playlist.isEditing"
                 class="text-white font-semibold mb-2 cursor-pointer"
                 @click="startEditingPlaylist(playlist)">
                {{ playlist.name }}
              </p>

              <input v-else
                     v-model="playlist.name"
                     class="bg-gray-600 text-white px-2 py-1 rounded w-full focus:outline-none"
                     ref="playlistNameInput"
                     @blur="savePlaylistName(playlist)"
                     @keyup.enter="savePlaylistName(playlist)" />
            </div>

            <button v-if="playlist.tracks.length === 0"
                    class="p-2 hover:bg-red-700/20 rounded-full transition-colors" @click="removePlaylist(pIndex)">
              <Trash2 class="w-5 h-5 text-red-400" />
            </button>
          </div>

          <draggable v-model="playlist.tracks"
                      group="tracks"
                      item-key="id"
                      animation="200"
                      @change="updateTrackOrder($event, playlist)"
                      ghost-class="bg-gray-500"
                     class="clearfix">
            <template #item="{ element, index }">
              <div class="cursor-move">
                <LibraryTrack :trackFile="element"
                              :isListView="isListView"
                              @remove-file="removeFromPlaylist(pIndex, index)"
                              @play="playTrack" />
              </div>
            </template>
          </draggable>
        </div>
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
  import { defineComponent, ref, onMounted, nextTick } from 'vue';
  import draggable from 'vuedraggable';

  import { DB_AddTrack, DB_RemoveTrack, DB_UpdateTrack, DB_GetTracks } from '@/persistance/TrackService';
  import { DB_AddPlaylist, DB_RemovePlaylist, DB_UpdatePlaylist, DB_GetPlaylists } from '@/persistance/PlaylistService';
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
      const playlists = ref<Playlist[]>([]);
      const isListView = ref(true);
      const playlistNameInput = ref<HTMLInputElement | null>(null);

      onMounted(async () => {
        playlists.value = await DB_GetPlaylists();
        const loadedTracks = await DB_GetTracks();

        unsortedTrackFiles.value = loadedTracks
         .filter(t => t.playlistId === undefined)
         .sort((a, b) => a.order - b.order);

        loadedTracks.forEach(track => {
          if (track.playlistId !== undefined) {
            const playlist = playlists.value.find(p => p.id === track.playlistId);
            if (playlist) {
              playlist.tracks.push(track);
            }
          }
        });

        playlists.value.forEach(playlist => {
          playlist.tracks.sort((a, b) => a.order - b.order)
        })

      });
      // Permet de basculer en mode édition pour une playlist
      function startEditingPlaylist(playlist: Playlist) {
        playlist.isEditing = true;
        nextTick(() => {
          playlistNameInput.value?.focus();
        });
      }

      // Sauvegarde le nom de la playlist
      async function savePlaylistName(playlist: Playlist) {
        if (!playlist.name.trim()) {
          playlist.name = "Nouvelle Playlist";
        }
        playlist.isEditing = false;
        await DB_UpdatePlaylist(playlist);
      }

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

      function removeFile(track: FileTrack) {
        // Supprimer le track s'il est dans la bibliothèque principale
        const libraryIndex = unsortedTrackFiles.value.findIndex(t => t.id === track.id);
        if (libraryIndex !== -1) {
          unsortedTrackFiles.value.splice(libraryIndex, 1);
          DB_RemoveTrack(track);
          return;
        }
        
        // Sinon, chercher dans les playlists et le supprimer de la bonne
        for (const playlist of playlists.value) {
          const trackIndex = playlist.tracks.findIndex(t => t.id === track.id);
          if (trackIndex !== -1) {
            playlist.tracks.splice(trackIndex, 1);
            DB_RemoveTrack(track);
            return;
          }
        }
      }
      
      function removeFromPlaylist(pIndex: number, index: number) {
        playlists.value[pIndex].tracks.splice(index, 1);
      }
      

      function playTrack(track: FileTrack) {
        emit('play', track);
      }

      function handleFileSelected(file: File) {
        addFile(file);
      }

      function handleFilesDropped(files: File[]) {
        addFiles(files);
      }

      async function updateTrackOrder(event: any, targetPlaylist: Playlist | undefined) {

        const targetList = targetPlaylist ? targetPlaylist.tracks : unsortedTrackFiles.value;

        if (event.added) {
          // Cas où un élément a été ajouté depuis une autre liste
          const { element, newIndex } = event.added;
       
          element.order = targetList.length - 1;
          element.playlistId = targetPlaylist ? targetPlaylist.id : undefined; // Met à jour la playlistId
          await DB_UpdateTrack(element);
        }

        for (let i = 0; i < targetList.length; i++) {
          targetList[i].order = i;
          await DB_UpdateTrack(targetList[i]);
        }

      }


      // Ajouter une playlist vide
      async function addPlaylist() {
        var playlist = new Playlist(`Playlist ${playlists.value.length + 1}`);
        await DB_AddPlaylist(playlist);
        playlists.value.push(playlist);
      }
     
      // Supprimer une playlist
      async function removePlaylist(index: number) {
        var playlist = playlists.value[index];
        await DB_RemovePlaylist(playlist);
        playlists.value.splice(index, 1);
      }
     
      return {
        unsortedTrackFiles,
        playlists,
        isListView,
        addFile,
        addFiles,
        removeFile,
        removeFromPlaylist,
        playTrack,
        handleFileSelected,
        handleFilesDropped,
        updateTrackOrder,
        addPlaylist,
        removePlaylist,
        startEditingPlaylist,
        savePlaylistName
      };
    }
  });
</script>
