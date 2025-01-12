<template>
  <!-- Player audio -->
  <audio ref="player"
         :src="src"
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
           v-model.number="volume"
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
      src: {
        type: String,
        required: true
      },
      autoPlay: {
        type: Boolean,
        default: false,
      },
      initialVolume: {
        type: Number,
        default: 0.8,
      }
    },
    emits: ['remove'], // Déclare l'événement "remove"
    setup(props, { emit }) {
      // Références vers nos éléments HTML
      const player = ref<HTMLAudioElement | null>(null);
      const canvas = ref<HTMLCanvasElement | null>(null);

      // States réactifs
      const isPlaying = ref(false);
      const isLooping = ref(false);
      const volume = ref(1);

      // Fonctions
      function togglePlay() {
        if (!player.value) {
          console.error('Player non initialisé.');
          return;
        }
        if (isPlaying.value) {
          player.value.pause();
        } else {
          player.value.play().catch((err) => {
            console.error('Erreur lors de la lecture audio :', err);
          });
        }
      }

      function toggleLoop() {
        if (!player.value) {
          console.error('Player non initialisé.');
          return;
        }
        isLooping.value = !isLooping.value;
        player.value.loop = isLooping.value;
      }

      function updateVolume() {
        if (!player.value) {
          console.error('Player non initialisé.');
          return;
        }
        player.value.volume = volume.value;
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
            src: props.src,
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
        if (props.src) {
          initializeWaveform();
          volume.value = props.initialVolume;
          player.value.volume = volume.value;
        }
        if (props.autoPlay && player.value) {
          player.value.play().catch((err) => {
            console.error('Erreur de lecture automatique :', err);
          });
        }
      });

      // Révoque l'URL Blob lorsque le composant est détruit
      onUnmounted(() => {
        if (props.src) {
          URL.revokeObjectURL(props.src);
        }
      });

      // Surveiller les changements de la prop src
      watch(
        () => props.src,
        (newSrc) => {
          if (newSrc) {
            initializeWaveform();
          }
        }
      );

      // On retourne les propriétés et fonctions qu'on veut utiliser dans le template
      return {
        player,
        canvas,
        isPlaying,
        isLooping,
        volume,
        togglePlay,
        toggleLoop,
        updateVolume,
        removeTrack,
        handleTrackEnd,
      };
    }
  });
</script>


<style scoped>
  /* Vos styles éventuels */
</style>
