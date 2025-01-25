<template>
  <div class="bg-gray-700 p-3 rounded mb-2 relative"
       @dragover.prevent="onDragOver"
       @drop.prevent="onDrop">
    <!-- Nom de la playlist -->
    <h3 class="text-white font-semibold mb-2">
      {{ playlist.name }} ({{ playlist.tracks.length }} tracks)
    </h3>

    <!-- Liste des tracks de la playlist -->
    <ul v-if="playlist.tracks.length" class="space-y-1">
      <li v-for="(track, idx) in playlist.tracks"
          :key="track.id"
          class="bg-gray-600 p-2 rounded">
        <LibraryTrack v-for="(trackFile, index) in trackFiles"
                      :key="index"
                      :trackFile="trackFile"
                      :index="index"
                      :isListView="true"
                      @remove-file="removeFile"
                      @play="playTrack" />
      </li>
    </ul>

    <div v-else class="text-gray-400 italic">
      Aucun track dans cette playlist.
    </div>

    <!-- Bouton de suppression de la playlist -->
    <button class="absolute top-2 right-2 text-red-400 hover:text-red-600"
            @click="onDeletePlaylist">
      Supprimer
    </button>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import Playlist from '@/models/Playlist';
import FileTrack from '@/models/FileTrack';

export default defineComponent({
  name: 'Playlist',
  props: {
    playlist: {
      type: Object as () => Playlist,
      required: true
    }
  },
  emits: ['delete-playlist'],
  setup(props, { emit }) {
    function onDragOver() {
      // Permet le drop
    }

    function onDrop(event: DragEvent) {
      // Récupérer la data "FileTrack" ou "id" du track
      if (!event.dataTransfer) return;
      const data = event.dataTransfer.getData('application/json');
      if (!data) return;

      const trackObj = JSON.parse(data) as FileTrack;
      // Ajouter le track si pas déjà dedans (au besoin)
      if (!props.playlist.tracks.find(t => t.id === trackObj.id)) {
        props.playlist.tracks.push(trackObj);
      }
    }

    function onDeletePlaylist() {
      // Émet un événement "delete-playlist"
      emit('delete-playlist', props.playlist);
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

    return {
      onDragOver,
      onDrop,
      onDeletePlaylist,
      removeFile,
      playTrack,
    };
  }
});
</script>
