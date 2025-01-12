<template>
  <!-- Player audio -->
  <audio ref="player"
         :src="track.src"
         @play="isPlaying = true"
         @pause="isPlaying = false"
         @ended="handleTrackEnd"
         :loop="isLooping" />

  <!-- Boutons Play/Pause et Boucler -->
  <div class="controls">
    <button class="btn-play" @click="togglePlay">
      {{ isPlaying ? '⏸️' : '▶️' }}
    </button>
    <button class="btn-loop" @click="toggleLoop">
      {{ isLooping ? '🔁' : '—' }}
    </button>
    <input class="volume-slider"
           type="range"
           min="0"
           max="1"
           step="0.01"
           v-model.number="track.volume"
           @input="updateVolume" />
    <button class="btn-remove" @click="removeTrack">
      🗑️
    </button>
  </div>

  <!-- Canvas pour la waveform -->
  <canvas ref="canvas" class="waveform"></canvas>
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
    },
    emits: ['update', 'remove'],
    setup(props, { expose, emit }) {
      const player = ref<HTMLAudioElement | null>(null);
      const canvas = ref<HTMLCanvasElement | null>(null);
      const isPlaying = ref(false);
      const isLooping = ref(props.track.loop || false);

      function togglePlay() {
        if (!player.value) return;
        isPlaying.value ? player.value.pause() : player.value.play();
      }

      function play() {
        if (!isPlaying.value) {
          player.value.play();
        }
      }
      function pause() {
        if (isPlaying.value) {
          player.value.pause();
        }
      }
      function toggleLoop() {
        if (!player.value) return;
        isLooping.value = !isLooping.value;
        emit('update', { ...props.track, loop: isLooping.value }); // Notifie le parent avec une copie modifiée de l'objet track
      }

      function updateVolume() {
        if (!player.value) {
          console.error('Player non initialisé.');
          return;
        }
        player.value.volume = props.track.volume;
        emit('update', props.track); // Notifie le parent
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
            playedLineWidth: 1,
            playedLineColor: "#AAA",
            noplayedLineWidth: 1,
            noplayedLineColor: "#0EE",
            playtimeFontColor: "#000",
          });
        } else {
          console.error('Player ou Canvas non initialisé.');
        }
      }

      // Attendre que le composant soit monté pour initialiser la waveform
      onMounted(() => {
        if (props.track.src) {
          initializeWaveform();
          player.value.volume = props.track.volume;
        }
        if (props.autoPlay && player.value) {
          player.value.play().catch((err) => {
            console.error('Erreur de lecture automatique :', err);
          });
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
