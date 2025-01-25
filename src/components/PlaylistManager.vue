<template>
  <div class="bg-gray-800 p-4 rounded-lg">
    <h2 class="text-xl font-bold text-white mb-4">Playlists</h2>

    <!-- Zone de création d'une playlist par drag&drop -->
    <div class="bg-gray-700 p-3 rounded mb-4 border-2 border-dashed border-gray-600 text-gray-300 text-center cursor-pointer"
         @dragover.prevent="onDragOverNewPlaylist"
         @drop.prevent="onDropNewPlaylist">
      Glisser un track ici pour créer une nouvelle playlist
    </div>

    <!-- Liste des playlists existantes -->
    <Playlist v-for="(pl, index) in playlists"
              :key="pl.id || index"
              :playlist="pl"
              @delete-playlist="removePlaylist" />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import Playlist from '@/models/Playlist';
import PlaylistComp from './Playlist.vue';
import FileTrack from '@/models/FileTrack';

export default defineComponent({
  name: 'PlaylistManager',
  components: {
    Playlist: PlaylistComp
  },
  setup() {
    const playlists = ref<Playlist[]>([]);

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
      playlists,
      onDragOverNewPlaylist,
      onDropNewPlaylist,
      removePlaylist
    };
  }
});
</script>
