<template>
  <div class="w-full bg-gray-800 rounded-lg p-4 pt-2">
    <ImportFileDragOverlay @files-dropped="handleFilesDropped">

      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center">
          <h2 class="text-xl font-bold text-purple-300 mr-2">Bibliothèque</h2>
          <Uploader @file-selected="handleFileSelected" />
          <HelpCircle
            class="w-5 text-gray-400 ml-1 cursor-help"
            v-tooltip="helpText"
          />
        </div>
        <div class="flex items-center gap-2">
          <input
            v-model="searchTerm"
            type="text"
            placeholder="Rechercher..."
            class="bg-gray-700 text-white px-2 py-1 rounded"
          />
          <ViewModePlayerToggle v-model:isListView="isListView" />
        </div>
      </div>

      <draggable
        v-model="playlists"
        item-key="id"
        animation="700"
        handle=".playlist-handle"
        tag="div"
        @change="updatePlaylistsOrder"
      >
        <template #item="{ element: playlist }">
          <div
            class="bg-gray-700/25 p-3 rounded mt-1 mb-1 flex flex-col relative"
            :class="!isListView ? 'float-left mr-2 border-r-[3px] border-purple-900' : ''"
            :style="!isListView ? { width: playlist.width ? playlist.width + 'px' : '100%' } : {}"
          >
            <div
              v-if="!isListView"
              class="absolute top-0 right-0 w-[10px] h-full cursor-col-resize"
              style="right:-6px"
              @mousedown="e => startResize(e, playlist)"
            />
            <div class="flex items-center mb-2">
              <div class="playlist-handle cursor-move p-1 mr-3 rounded hover:bg-gray-800/25">
                <GripVertical class="w-5 h-5 text-gray-400" />
              </div>

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

              <button v-if="playlist.items.length === 0"
                      class="p-2 hover:bg-red-700/20 rounded-full transition-colors ml-3"
                      @click="removePlaylist(playlist)"
              >
                <Trash2 class="w-5 h-5 text-red-400" />
              </button>
            </div>

            <draggable v-model="playlist.items"
                       group="library-items"
                       item-key="id"
                       animation="700"
                       handle=".track-drag-handle"
                       tag="div"
                       :disabled="searchTerm !== ''"
                       :class="isListView
                          ? 'flex flex-col space-y-1'
                          : 'flex flex-wrap justify-start'"
                       @change="e => updateItemOrder(playlist, e)">
              <template #item="{ element }">
                <div v-if="itemMatchesSearch(element)">
                  <LibraryItemCard
                    :item="element"
                    :isListView="isListView"
                    :dragDisabled="searchTerm !== ''"
                    @remove="() => removeItem(playlist, element)"
                    @play-audio="handlePlayAudio"
                    @open-image="handleOpenImage"
                  />
                </div>
              </template>
              <template #footer>
                <div v-if="visibleItems(playlist).length === 0">
                  <p class="text-gray-400 text-xl">
                    🕸️🕸️🕸
                  </p>
                </div>
              </template>
            </draggable>
          </div>
        </template>
      </draggable>
      <div class="clear-both"></div>

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
  import { computed, defineComponent, onBeforeUnmount, onMounted, ref, watch } from 'vue';
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
  import {
    DB_AddImage,
    DB_GetImages,
    DB_RemoveImage,
    DB_UpdateImage,
  } from '@/persistance/ImageService';
  import FileTrack from '@/models/FileTrack';
  import GalleryImage from '@/models/GalleryImage';
  import Playlist from '@/models/Playlist';
  import type LibraryItemModel from '@/models/LibraryItem';
  import LibraryItemCard from './LibraryTrack.vue';
  import Uploader from './Uploader.vue';
  import ImportFileDragOverlay from './ImportFileDragOverlay.vue';
  import ViewModePlayerToggle from './ViewModePlayerToggle.vue';
  import { GripVertical, HelpCircle, Plus, Trash2 } from 'lucide-vue-next';
  import tooltip from '@/directives/tooltip';
  import { Cookies } from '@/models/Cookies';

  const focus = {
    mounted(el: HTMLElement) {
      el.focus();
    }
  };

  export default defineComponent({
    name: 'Library',
    components: {
      LibraryItemCard,
      Uploader,
      ImportFileDragOverlay,
      ViewModePlayerToggle,
      draggable,
      GripVertical,
      HelpCircle,
      Plus,
      Trash2,
    },
    directives: { focus, tooltip },
    emits: ['playAudio', 'openImage'],
    setup(_, { emit, expose }) {
      const playlists = ref<Playlist[]>([]);
      const isListView = ref(Cookies.get('viewMode') !== 'soundboard');
      const searchTerm = ref('');
      const helpText =
        'Pour ranger directement votre fichier dans une playlist en particulier, ' +
        'préfixez son nom par "Nom_Playlist --". Exemple : "MaPlaylist -- MonFichier"';
      const resizing = ref<Playlist | null>(null);
      const lastPresentedImage = ref<GalleryImage | null>(null);
      const presentationWindow = ref<Window | null>(null);
      let presentationWindowMonitor: number | null = null;
      let startX = 0;
      let startWidth = 0;

      watch(isListView, newVal => {
        Cookies.set(
          'viewMode',
          newVal ? 'list' : 'soundboard',
          365,
          '/'
        );
      });

      onMounted(async () => {
        playlists.value = await DB_GetPlaylists();
        if (!playlists.value.length) await ensureLibrary();
        const [loadedTracks, loadedImages] = await Promise.all([
          DB_GetTracks(),
          DB_GetImages(),
        ]);

        playlists.value.forEach(pl => {
          if (!pl.items) {
            pl.items = [];
          }
        });

        loadedTracks.forEach(track => {
          const pl = playlists.value.find(p => p.id === track.playlistId) || playlists.value[0];
          track.playlistId = pl.id;
          pl.items.push(track);
        });

        loadedImages.forEach(image => {
          const pl = playlists.value.find(p => p.id === image.playlistId) || playlists.value[0];
          image.playlistId = pl.id;
          image.ensureObjectUrl();
          pl.items.push(image);
        });

        playlists.value.forEach(pl => pl.items.sort((a, b) => a.order - b.order));
      });

      onBeforeUnmount(() => {
        stopPresentationWindowMonitor();
        presentationWindow.value?.removeEventListener('beforeunload', handlePresentationClosed);
        presentationWindow.value = null;
      });

      async function handleFilesDropped(files: File[]) {
        for (const file of files) await addFile(file);
      }
      async function handleFileSelected(file: File) { await addFile(file); }

      async function addFile(file: File) {
        if (!playlists.value.length) await ensureLibrary();
        const { playlistName, itemName } = parseName(file.name);

        let target: Playlist | undefined;
        if (playlistName) {
          const idx = playlists.value.findIndex(
            p => p.name.toLowerCase() === playlistName.toLowerCase()
          );
          if (idx !== -1) {
            target = playlists.value[idx];
          } else {
            const newPl = new Playlist(playlistName);
            newPl.order = playlists.value.length;
            newPl.id = await DB_AddPlaylist(newPl);
            playlists.value.push(newPl);
            target = playlists.value[playlists.value.length - 1];
          }
        } else {
          target = playlists.value[0];
        }
        if (!target) return;

        if (file.type.startsWith('image/')) {
          await addImageToPlaylist(file, itemName, target);
        } else if (file.type.startsWith('audio/')) {
          await addTrackToPlaylist(file, itemName, target);
        }
      }

      async function addTrackToPlaylist(file: File, itemName: string, target: Playlist) {
        const ft = new FileTrack(file, itemName);
        ft.playlistId = target.id;
        ft.order = target.items.length;
        ft.id = await DB_AddTrack(ft);
        target.items.push(ft);
      }

      async function addImageToPlaylist(file: File, itemName: string, target: Playlist) {
        const img = new GalleryImage(file, itemName);
        img.playlistId = target.id;
        img.order = target.items.length;
        await DB_AddImage(img);
        img.ensureObjectUrl();
        target.items.push(img);
      }

      function parseName(name: string) {
        const parts = name.split('--');
        let playlistName: string | undefined;
        let itemName = name;
        if (parts.length > 1) {
          playlistName = parts[0].trim();
          itemName = parts.slice(1).join('--').trim();
        }
        itemName = itemName.replace(/\.[^/.]+$/, '');
        return { playlistName, itemName };
      }

      async function ensureLibrary() {
        const defaultPl = new Playlist('Bibliothèque');
        defaultPl.order = playlists.value.length;
        defaultPl.id = await DB_AddPlaylist(defaultPl);
        playlists.value.unshift(defaultPl);
      }

      async function removeItem(pl: Playlist, item: LibraryItemModel) {
        const idx = pl.items.findIndex(i => i === item);
        if (idx > -1) {
          pl.items.splice(idx, 1);
          if (item.kind === 'audio') {
            await DB_RemoveTrack(item as FileTrack);
          } else {
            await DB_RemoveImage(item as GalleryImage);
          }
          await persistPlaylistOrder(pl);
        }
      }

      function handlePlayAudio(track: FileTrack) { emit('playAudio', track); }

      function handleOpenImage(image: GalleryImage) {
        lastPresentedImage.value = image;
        sendToPresentation(image);
        emit('openImage', image);
      }

      function ensurePresentationWindow(): Window | null {
        if (presentationWindow.value && !presentationWindow.value.closed) {
          return presentationWindow.value;
        }

        const newWindow = window.open(
          '/MJScreen/gallery-viewer.html',
          'gallery-viewer',
          'width=800,height=600'
        );

        if (!newWindow) {
          handlePresentationClosed();
          return null;
        }

        presentationWindow.value = newWindow;
        presentationWindow.value.addEventListener('beforeunload', handlePresentationClosed);
        presentationWindowMonitor = window.setInterval(() => {
          if (presentationWindow.value?.closed) {
            handlePresentationClosed();
          }
        }, 500);

        return presentationWindow.value;
      }

      function stopPresentationWindowMonitor() {
        if (presentationWindowMonitor !== null) {
          window.clearInterval(presentationWindowMonitor);
          presentationWindowMonitor = null;
        }
      }

      function handlePresentationClosed() {
        stopPresentationWindowMonitor();
        if (presentationWindow.value) {
          presentationWindow.value.removeEventListener('beforeunload', handlePresentationClosed);
        }
        presentationWindow.value = null;
      }

      function sendToPresentation(image: GalleryImage) {
        const win = ensurePresentationWindow();
        if (!win) return;
        win.postMessage({
          type: 'display-image',
          url: image.ensureObjectUrl(),
          name: image.name,
        }, window.location.origin);
      }

      function openImageViewer() {
        const win = ensurePresentationWindow();
        if (!win) return;
        win.focus();
        if (lastPresentedImage.value) {
          sendToPresentation(lastPresentedImage.value);
        }
      }

      async function savePlaylistName(pl: Playlist) {
        if (!pl.name.trim()) pl.name = 'Nouvelle Playlist';
        pl.isEditing = false;
        await DB_UpdatePlaylist(pl);
      }

      async function addPlaylist() {
        const pl = new Playlist(`Playlist ${playlists.value.length}`);
        pl.order = playlists.value.length;
        pl.id = await DB_AddPlaylist(pl);
        playlists.value.push(pl);
        await updatePlaylistsOrder();
      }
      async function removePlaylist(pl: Playlist) {
        await DB_RemovePlaylist(pl);

        const idx = playlists.value.findIndex(p => p.id === pl.id);
        if (idx > -1) {
          playlists.value.splice(idx, 1);
        }
        await updatePlaylistsOrder();
      }

      async function updateItemOrder(pl: Playlist, event: any) {
        if (event.added) {
          const { element, newIndex } = event.added;
          element.playlistId = pl.id;
          element.order = newIndex;
          if (element.kind === 'audio') {
            await DB_UpdateTrack(element as FileTrack);
          } else {
            await DB_UpdateImage(element as GalleryImage);
          }
        }
        await persistPlaylistOrder(pl);
      }

      async function persistPlaylistOrder(pl: Playlist) {
        for (let i = 0; i < pl.items.length; i++) {
          const item = pl.items[i];
          item.order = i;
          if (item.kind === 'audio') {
            await DB_UpdateTrack(item as FileTrack);
          } else {
            await DB_UpdateImage(item as GalleryImage);
          }
        }
      }

      async function updatePlaylistsOrder() {
        for (let i = 0; i < playlists.value.length; i++) {
          const playlist = playlists.value[i];
          if (playlist.order !== i) {
            playlist.order = i;
            await DB_UpdatePlaylist(playlist);
          }
        }
      }

      function startResize(e: MouseEvent, pl: Playlist) {
        resizing.value = pl;
        startX = e.clientX;
        startWidth = pl.width ??
          ((e.currentTarget as HTMLElement).parentElement?.clientWidth || 0);
        document.addEventListener('mousemove', onResizing);
        document.addEventListener('mouseup', stopResize);
      }

      function onResizing(e: MouseEvent) {
        if (!resizing.value) return;
        const newWidth = Math.max(150, startWidth + e.clientX - startX);
        resizing.value.width = newWidth;
      }

      async function stopResize() {
        if (resizing.value) {
          await DB_UpdatePlaylist(resizing.value);
        }
        document.removeEventListener('mousemove', onResizing);
        document.removeEventListener('mouseup', stopResize);
        resizing.value = null;
      }

      function itemMatchesSearch(item: LibraryItemModel) {
        if (!searchTerm.value) return true;
        return item.name.toLowerCase().includes(searchTerm.value.toLowerCase());
      }

      function visibleItems(pl: Playlist) {
        return pl.items.filter(t => itemMatchesSearch(t));
      }

      expose({
        openImageViewer,
      });

      return {
        playlists,
        isListView,
        searchTerm,
        handleFileSelected,
        handleFilesDropped,
        addPlaylist,
        removePlaylist,
        savePlaylistName,
        updatePlaylistsOrder,
        updateItemOrder,
        handlePlayAudio,
        handleOpenImage,
        removeItem,
        startResize,
        itemMatchesSearch,
        visibleItems,
        helpText,
      };
    },
  });
</script>
