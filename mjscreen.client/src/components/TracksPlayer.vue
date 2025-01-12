
<template>
  <div>
    <button @click="toggleAutoplay">Autoplay {{ autoPlayMode ? 'ON' : 'OFF' }}</button>
    <button @click="playAll">▶️ all</button>
    <button @click="pauseAll">⏸️ all</button>
    <button @click="removeAllTracks">🗑️ all</button>
    <div v-for="track in tracks" :key="track.id">
      <Track ref="trackRefs"
             :src="track.src"
             :autoPlay="track.autoPlay"
             :initialVolume="track.initialVolume"
             @remove="removeTrack(track)" />
    </div>
  </div>
</template>

<script lang="ts">
  import { defineComponent, ref } from 'vue';
  import TrackComponent from './Track.vue';
  import Track from '../models/Track';

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
      const trackRefs = ref<(InstanceType<typeof TrackComponent> | null)[]>([]); // Tableau de références aux composants Track

      const addTrack = (file: File, volume: number) => {
        const track = new Track(file, volume, _.autoPlayMode); // Crée une nouvelle instance de Track
        tracks.value.push(track);
      };

      const removeTrack = (track: Track) => {
        // Supprime la piste de la liste
        tracks.value = tracks.value.filter((t) => t.id !== track.id);
        track.revokeUrl(); // Révoque l'URL Blob associée
      };


      const removeAllTracks = () => {
        tracks.value.forEach((track) => track.revokeUrl());
        tracks.value = [];
      };

      const toggleAutoplay = () => {
        const newAutoPlayMode = !_.autoPlayMode;
        emit('update:autoplayMode', newAutoPlayMode);
      };

      const playAll = () => {
        // Appelle la méthode play de chaque composant Track
        trackRefs.value.forEach((trackRef) => {
          trackRef?.play();
        });
      };

      const pauseAll = () => {
        // Appelle la méthode pause de chaque composant Track
        trackRefs.value.forEach((trackRef) => {
          trackRef?.pause();
        });
      };


      return {
        tracks,
        trackRefs,
        addTrack,
        removeTrack,
        removeAllTracks,
        toggleAutoplay,
        playAll,
        pauseAll,
      };
    },
  });
</script>
