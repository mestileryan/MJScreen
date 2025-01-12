<template>
  <div>
    <button @click="toggleAutoplay">Autoplay {{ autoPlayMode ? 'ON' : 'OFF' }}</button>
    <div v-for="track in tracks" :key="track.id">
      <Track :src="track.src" :autoPlay="track.autoPlay" :initialVolume="track.initialVolume" @remove="removeTrack(track)" />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import TrackComponent from './Track.vue';
import Track from '../models/Track'; // La classe Track

export default defineComponent({
  name: 'TracksPlayer',
  components: {
    Track: TrackComponent,
  },
  props: {
    autoPlayMode: {
      type: Boolean,
      required: true,
    },
  },
  emits: ['update:autoplayMode'],
  setup(_, { emit }) {
    const tracks = ref<Track[]>([]);

    const addTrack = (file: File, volume: number) => {
      const track = new Track(file, volume, _.autoPlayMode); // Crée une nouvelle instance de Track
      tracks.value.push(track);
    };

    const removeTrack = (track: Track) => {
      // Supprime la piste de la liste
      tracks.value = tracks.value.filter((t) => t.id !== track.id);
      track.revokeUrl(); // Révoque l'URL Blob associée
    };
      const toggleAutoplay = () => {
      const newAutoPlayMode = !_.autoPlayMode;
      emit('update:autoplayMode', newAutoPlayMode);
    };

    return {
      tracks,
      addTrack,
      removeTrack,
      toggleAutoplay,
    };
  },
});
</script>
