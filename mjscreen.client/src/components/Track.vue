<template>
  <!-- Player audio -->
  <audio ref="player" :src="src" />

  <!-- Boutons Play/Pause -->
  <button @click="playAudio">Play</button>
  <button @click="pauseAudio">Pause</button>

  <!-- Canvas pour la waveform -->
  <canvas ref="canvas"></canvas>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, watch } from 'vue';
import { useAVWaveform } from 'vue-audio-visual';

export default defineComponent({
  name: 'Track',
  props: {
    src: {
      type: String,
      required: true,
    },
  },
  setup(props) {
    const player = ref<HTMLAudioElement | null>(null);
    const canvas = ref<HTMLCanvasElement | null>(null);

    const playAudio = () => {
      if (player.value) {
        player.value.play().catch((err) => {
          console.error('Erreur lors de la lecture audio :', err);
        });
      } else {
        console.error('Player non initialisé.');
      }
    };

    const pauseAudio = () => {
      if (player.value) {
        player.value.pause();
      } else {
        console.error('Player non initialisé.');
      }
    };

    // Initialise la waveform lorsque la source change
    watch(
      () => props.src,
      (newSrc) => {
        if (player.value && canvas.value) {
          useAVWaveform(player, canvas, {
            src: newSrc,
            playtimeWithMs: false,
          });
        } else {
          console.error('Player ou Canvas non initialisé.');
        }
      }
    );

    return {
      player,
      canvas,
      playAudio,
      pauseAudio,
    };
  },
});
</script>

<style scoped>
/* Styles optionnels */
</style>
