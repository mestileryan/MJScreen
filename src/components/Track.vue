<template>
  <p class="text-white text-xs mb-1">{{ track.name }}</p>
  <!-- Player audio -->
  <audio ref="player"
         :src="track.src"
         @play="isPlaying = true"
         @pause="isPlaying = false"
         @ended="handleTrackEnd"
         :loop="isLooping" />

  <!-- Canvas pour la waveform -->
  <canvas ref="canvas" class="rounded bg-gray-600 mb-1" />

  <!-- Boutons Play/Pause et Boucler -->
  <div class="flex gap-1">
    <button class="rounded-full hover:bg-red-400/20 transition-colors" @click="removeTrack">
      <Trash2 class="w-5 h-5 text-red-400" />
    </button>
    <button class="rounded-full hover:bg-gray-400/20 transition-colors" @click="togglePlay">
      <Pause v-if="isPlaying" class="w-5 h-5 text-gray-400" />
      <Play v-if="!isPlaying" class="w-5 h-5 text-green-400" />
    </button>
    <button class="rounded-full hover:bg-gray-400/20 transition-colors" @click="toggleLoop">
      <Repeat1 v-if="isLooping" class="w-5 h-5 text-purple-400" />
      <Repeat1 v-if="!isLooping" class="w-5 h-5 text-gray-400" />
    </button>

    <div class="ml-1 mr-1">
      <VolumeOff v-if="track.volume == 0" class="w-5 h-5 text-red-400"></VolumeOff>
      <Volume v-if="track.volume > 0 && track.volume <= 0.33" class="w-5 h-5 text-purple-400"></Volume>
      <Volume1 v-if="track.volume > 0.33 && track.volume <= 0.66" class="w-5 h-5 text-purple-400"></Volume1>
      <Volume2 v-if="track.volume > 0.66 && track.volume <= 1" class="w-5 h-5 text-purple-400"></Volume2>
    </div>

    <input class="w-20"
           type="range"
           min="0"
           max="1"
           step="0.01"
           v-model.number="track.volume"
           @input="updateVolume" />

  </div>
</template>

<script lang="ts">
  import { defineComponent, ref, watch, onMounted, onUnmounted } from 'vue';
  import { useAVWaveform } from 'vue-audio-visual';

  export default defineComponent({
    name: 'Track',
    props: {
      track: {
        type: Object,
        required: true,
      },
      autoPlay: {
        type: Boolean,
        default: false,
      },
      sinkId: {
        type: String,
        required: true,
      }
    },
    emits: ['update', 'remove'],
    setup(props, { expose, emit }) {
      const player = ref<HTMLAudioElement | null>(null);
      const canvas = ref<HTMLCanvasElement | null>(null);
      const isPlaying = ref(false);
      const isLooping = ref(props.track.loop || false);

      function togglePlay() {
        if (!player.value) return;
        isPlaying.value ? player.value.pause() : play();
      }

      function play() {
        if (!isPlaying.value) {
          player.value?.setSinkId(props.sinkId)
          player.value?.play();
        }
      }
      function pause() {
        if (isPlaying.value) {
          player.value?.pause();
        }
      }
      function toggleLoop() {
        if (!player.value) return;
        isLooping.value = !isLooping.value;
        props.track.loop = isLooping.value;
        props.track.fileTrack.loop = isLooping.value;
        emit('update', props.track);
      }

      function updateVolume() {
        if (!player.value) {
          console.error('Player non initialisé.');
          return;
        }
        player.value.volume = props.track.volume;
        props.track.fileTrack.initialVolume = props.track.volume;
        emit('update', props.track);
      }

      // Fonction pour supprimer la track
      function removeTrack() {
        emit('remove'); // Émet l'événement "remove" vers le parent
      }

      // Gère la fin de la lecture
      function handleTrackEnd() {
        if (!isLooping.value) {
          removeTrack(); // Émet l'événement "remove" si la piste n'est pas en mode boucle
        }
      }

      // Initialisation de la waveform
      function initializeWaveform() {
        if (player.value && canvas.value) {
          useAVWaveform(player, canvas, {
            src: props.track.src,
            playtimeWithMs: false,
            canvHeight: 25,
            canvWidth: 300,
            playedLineWidth: 1,
            playedLineColor: "#777",
            noplayedLineWidth: 1,
            noplayedLineColor: "#077",
            playtimeFontColor: "#aaa",
            playtimeSliderColor: "#F77"
          });
        } else {
          console.error('Player ou Canvas non initialisé.');
        }
      }

      // Attendre que le composant soit monté pour initialiser la waveform
      onMounted(() => {
        if (props.track.src) {
          initializeWaveform();
          if (player.value) {
            player.value.volume = props.track.volume;
          }
        }
        if (props.autoPlay && player.value) {
          play();
        }
      });

      watch(
        () => props.track.src,
        (newSrc) => {
          if (newSrc) {
            initializeWaveform();
          }
        }
      );

      watch(
        () => props.sinkId,
        (newSinkId) => {
          if (player.value && newSinkId) {
            player.value
              .setSinkId(newSinkId)
              .catch((err: Error) => {
                console.error("Erreur lors de la mise à jour du sinkId :", err);
              });
          }
        }
      );
      
      expose({
        play,
        pause,
      });

      return {
        player,
        canvas,
        isPlaying,
        isLooping,
        togglePlay,
        toggleLoop,
        updateVolume,
        removeTrack,
        handleTrackEnd,
        play,
        pause,
      };
    }
  });
</script>
