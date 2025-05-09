<template>
  <div class="flex flex-col items-center justify-center gap-6 h-full">
    <div class="flex items-center justify-center gap-6">
      <button @click="toggleAutoplay" class="rounded-full hover:bg-gray-600/20 transition-colors">
        <SquareMousePointer class="w-8 h-8 text-purple-400" v-if="autoPlayMode" />
        <SquareDashedMousePointer class="w-8 h-8 text-gray-600" v-if="!autoPlayMode" />
      </button>
      <button @click="playAll" class="rounded-full hover:bg-gray-400/20 transition-colors">
        <CirclePlay class="w-8 h-8 text-green-400" />
      </button>
      <button @click="pauseAll" class="rounded-full hover:bg-white/20 transition-colors">
        <CirclePause class="w-8 h-8 text-white" />
      </button>
      <button @click="removeAllTracks" class="rounded-full hover:bg-red-400/20 transition-colors">
        <Bomb class="w-8 h-8 text-red-400" />
      </button>
    </div>

    <div v-for="(track, index) in tracks" :key="track.id">
      <div class="mt-3">
        <TrackComponent ref="trackRefs"
                        :track="track"
                        :autoPlay="autoPlayMode"
                        :sinkId="selectedOutputChannel"
                        @update="updateTrack(index, $event)"
                        @remove="removeTrack(track)" />
      </div>
    </div>

    <div class="mt-4 mt-auto w-full">
      <label for="outputChannel" class="block mb-2 text-sm font-medium text-purple-300">
        Canal audio de diffusion
      </label>
      <select id="outputChannel" v-model="selectedOutputChannel"
              class="bg-gray-900 border border-purple-600 text-purple-300 text-sm rounded-lg block w-full p-2.5">
        <option v-for="channel in outputChannels" :key="channel.deviceId" :value="channel.deviceId">
          {{ channel.label || 'Canal ' + channel.deviceId }}
        </option>
      </select>
    </div>
  </div>
</template>

<script lang="ts">
  import { defineComponent, ref, onMounted } from 'vue';
  import TrackComponent from './Track.vue';
  import Track from '../models/Track';

  export default defineComponent({
    name: 'TracksPlayer',
    components: {
      TrackComponent,
    },
    setup() {
      const tracks = ref<Track[]>([]);
      const trackRefs = ref<(InstanceType<typeof TrackComponent> | null)[]>([]);
      const autoPlayMode = ref(false);

      const outputChannels = ref<MediaDeviceInfo[]>([]);
      const selectedOutputChannel = ref('');

      const getOutputChannels = async () => {
        try {
          await navigator.mediaDevices.getUserMedia({ audio: { deviceId: "default" } });
          const devices = await navigator.mediaDevices.enumerateDevices();
          outputChannels.value = devices.filter(device => device.kind === 'audiooutput');
          if (outputChannels.value.length > 0) {
            selectedOutputChannel.value = outputChannels.value[0].deviceId;
          }
        } catch (error) {
          console.error("Erreur lors de la récupération des dispositifs audio :", error);
        }
      };

      const addTrack = (file: File, name: string, volume: number) => {
        const track = new Track(file, name, volume);
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

      onMounted(() => {
        getOutputChannels();
      });

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
        outputChannels,
        selectedOutputChannel,
      };
    },
  });
</script>