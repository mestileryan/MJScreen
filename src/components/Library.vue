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

      <draggable
        v-model="playlists"
        item-key="id"
        animation="700"
        handle=".playlist-handle"
        tag="div"
      >
        <template #item="{ element: playlist }">
          <div class="bg-gray-700/25 p-3 rounded mt-1 mb-1 flex flex-col">
           <!-- ——— HEADER : poignée + titre + poubelle ——— -->
           <div class="flex items-center mb-2">
               <!-- 1) Poignée -->
               <div class="playlist-handle cursor-move p-1 mr-3 rounded hover:bg-gray-800/25"
                    title="Déplacer la playlist"
               >
                   <GripVertical class="w-5 h-5 text-gray-400" />

              </div>

               <!-- 2) Titre éditable -->
               <div class="flex-1">
                   <p v-if="!playlist.isEditing"
                      class="text-white font-semibold cursor-pointer"
                      @click="playlist.isEditing = true"
                    >
                       {{ playlist.name }}
                </p>
                   <input v-else
                          v-model="playlist.name"
                          v-focus
                          class="bg-gray-600 text-white px-2 py-1 rounded w-full focus:outline-none"
                          @blur="savePlaylistName(playlist)"
                          @keyup.enter="savePlaylistName(playlist)"
                   />
              </div>

               <!-- 3) Bouton poubelle -->
               <button v-if="playlist.tracks.length === 0"
                       class="p-2 hover:bg-red-700/20 rounded-full transition-colors ml-3"
                       @click="removePlaylist(playlist)"
               >
                   <Trash2 class="w-5 h-5 text-red-400" />
              </button>
            </div>

            <draggable v-model="playlist.tracks"
                       group="tracks"
                       item-key="id"
                       animation="700"
                       tag="div"
                       :class="isListView
                          ? 'flex flex-col space-y-1'
                          : 'flex flex-wrap justify-start'"
                       @change="e => updateTrackOrder(playlist, e)">
              <template #item="{ element }">
                <div class="cursor-move">
                  <LibraryTrack :trackFile="element"
                                :isListView="isListView"
                                @remove-file="() => removeTrack(playlist, element)"
                                @play="playTrack" />
                </div>
              </template>
              <template #footer>
                <div v-if="playlist.tracks.length === 0">
                  <p class="text-gray-400 italic">
                    C'est vide ! 👀🕸️
                  </p>
                </div>
              </template>
            </draggable>



          </div>

        </template>
      </draggable>

      <div class="bg-gray-700/25 p-3 rounded mt-1 mb-1
         border-2 border-dashed border-gray-400
         flex items-center justify-center
         cursor-pointer hover:bg-gray-800/25 transition-colors"
           @click="addPlaylist"
           title="Ajouter une playlist">
        <Plus class="w-6 h-6 text-purple-500" />
      </div>

    </ImportFileDragOverlay>
  </div>
</template>

<script lang="ts">
  import { defineComponent, ref, onMounted, watch } from 'vue';
  import draggable from 'vuedraggable';
  import {
    DB_AddTrack,
    DB_RemoveTrack,
    DB_UpdateTrack,
    DB_GetTracks,
  } from '@/persistance/TrackService';
  import {
    DB_AddPlaylist,
    DB_RemovePlaylist,
    DB_UpdatePlaylist,
    DB_GetPlaylists,
  } from '@/persistance/PlaylistService';
  import FileTrack from '@/models/FileTrack';
  import Playlist from '@/models/Playlist';
  import LibraryTrack from './LibraryTrack.vue';
  import Uploader from './Uploader.vue';
  import ImportFileDragOverlay from './ImportFileDragOverlay.vue';
  import ViewModePlayerToggle from './ViewModePlayerToggle.vue';
  import { GripVertical } from 'lucide-vue-next'
  import Cookies from 'js-cookie';

  // Directive autofocus
  const focus = {
    mounted(el: HTMLElement) {
      el.focus();
    }
  };

  export default defineComponent({
    name: 'Library',
    components: {
      LibraryTrack, Uploader, ImportFileDragOverlay,
      ViewModePlayerToggle, draggable, GripVertical
    },
    directives: { focus },
    setup(_, { emit }) {
      const playlists = ref<Playlist[]>([]);
      const isListView = ref(
        Cookies.get('viewMode') === 'soundboard'   // si cookie « soundboard », sinon list
          ? false
          : true
      );
      const playlistNameInput = ref<HTMLInputElement | null>(null);

      watch(isListView, (list) => {
        Cookies.set(
          'viewMode',
          list ? 'list' : 'soundboard',
          { expires: 365, path: '/' }
        );
      });

      onMounted(async () => {
        playlists.value = await DB_GetPlaylists();
        if (!playlists.value.length) await ensureLibrary();
        const loaded = await DB_GetTracks();
        loaded.forEach(track => {
          const pl = playlists.value.find(p => p.id === track.playlistId) || playlists.value[0];
          track.playlistId = pl.id;
          pl.tracks.push(track);
        });
        playlists.value.forEach(pl => pl.tracks.sort((a, b) => a.order - b.order));
      });

      async function handleFilesDropped(files: File[]) {
        for (const file of files) await addFile(file);
      }
      function handleFileSelected(file: File) { addFile(file); }

      async function addFile(file: File) {
        if (!playlists.value.length) await ensureLibrary();
        const lib = playlists.value[0];
        const ft = new FileTrack(file, file.name);
        ft.playlistId = lib.id;
        ft.order = lib.tracks.length;
        ft.id = await DB_AddTrack(ft);
        lib.tracks.push(ft);
      }

      async function ensureLibrary() {
        const defaultPl = new Playlist('Bibliothèque');
        defaultPl.id = await DB_AddPlaylist(defaultPl);
        playlists.value.unshift(defaultPl);
      }

      function removeTrack(pl: Playlist, track: FileTrack) {
        const idx = pl.tracks.findIndex(t => t.id === track.id);
        if (idx > -1) {
          pl.tracks.splice(idx, 1);
          DB_RemoveTrack(track);
        }
      }

      function playTrack(track: FileTrack) { emit('play', track); }

      async function savePlaylistName(pl: Playlist) {
        if (!pl.name.trim()) pl.name = 'Nouvelle Playlist';
        pl.isEditing = false;
        await DB_UpdatePlaylist(pl);
      }

      async function addPlaylist() {
        const pl = new Playlist(`Playlist ${playlists.value.length}`);
        pl.id = await DB_AddPlaylist(pl);
        playlists.value.push(pl);
      }
      async function removePlaylist(pl: Playlist) {
        await DB_RemovePlaylist(pl);

        const idx = playlists.value.findIndex(p => p.id === pl.id);
        if (idx > -1) {
          playlists.value.splice(idx, 1);
        }
      }

      async function updateTrackOrder(pl: Playlist, event: any) {
        // Si on drop une track depuis une autre playlist ou la bibliothèque
        if (event.added) {
          const { element, newIndex } = event.added;
          // On l’assigne à la bonne playlist
          element.playlistId = pl.id;
          element.order = newIndex;
          await DB_UpdateTrack(element);
        }
        // Puis on ré‐numérote tout
        for (let i = 0; i < pl.tracks.length; i++) {
          pl.tracks[i].order = i;
          await DB_UpdateTrack(pl.tracks[i]);
        }
      }

      return {
        playlists,
        isListView,
        playlistNameInput,
        handleFileSelected,
        handleFilesDropped,
        addPlaylist,
        removePlaylist,
        savePlaylistName,
        updateTrackOrder,
        playTrack,
        removeTrack,
      };
    }
  });
</script>
