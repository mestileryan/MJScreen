
<template>
  <div class="flex items-center justify-center gap-6">
    <button @click="toggleAutoplay">
      <SquareMousePointer class="w-8 h-8 text-purple-400" v-if="autoPlayMode" />
      <SquareDashedMousePointer class="w-8 h-8 text-gray-600"  v-if="!autoPlayMode" />
    </button>
    <button @click="playAll">
      <CirclePlay class="w-8 h-8 text-green-400" />
    </button>
    <button @click="pauseAll">
      <CirclePause class="w-8 h-8 text-white" />
    </button>
    <button @click="removeAllTracks">
      <Bomb class="w-8 h-8 text-red-400" />
    </button>
  </div>

  <div v-for="(track, index) in tracks" :key="track.id">
    <Track ref="trackRefs"
            :track="track"
            :autoPlay="autoPlayMode"
            @update="updateTrack(index, $event)"
            @remove="removeTrack(track)" />
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
    setup() {
      const tracks = ref<Track[]>([]);
      const trackRefs = ref<(InstanceType<typeof TrackComponent> | null)[]>([]);
      const autoPlayMode = ref(false); // Contrôle global de l'autoplay

      const addTrack = (file: File, volume: number) => {
        const track = new Track(file, volume);
        tracks.value.push(track);
      };

      const updateTrack = (index: number, updatedTrack: Track) => {
        tracks.value[index] = updatedTrack;
      };

      const removeTrack = (track: Track) => {
        tracks.value = tracks.value.filter((t) => t.id !== track.id);
        track.revokeUrl();
      };

      const removeAllTracks = () => {
        tracks.value.forEach((track) => track.revokeUrl());
        tracks.value = [];
      };

      const toggleAutoplay = () => {
        autoPlayMode.value = !autoPlayMode.value;
      };

      const playAll = () => {
        trackRefs.value.forEach((trackRef) => {
          trackRef?.play();
        });
      };

      const pauseAll = () => {
        trackRefs.value.forEach((trackRef) => {
          trackRef?.pause();
        });
      };

      return {
        tracks,
        trackRefs,
        autoPlayMode,
        addTrack,
        updateTrack,
        removeTrack,
        removeAllTracks,
        toggleAutoplay,
        playAll,
        pauseAll,
      };
    },
  });

</script>
