<template>
  <!-- Player audio -->
  <audio ref="player" :src="src" @play="isPlaying = true" @pause="isPlaying = false" loop="isLooping" />

  <!-- Boutons Play/Pause et Boucler -->
  <div class="controls">
    <button class="btn-play" @click="togglePlay">{{ isPlaying ? '⏸️' : '▶️' }}</button>
    <button class="btn-loop" @click="toggleLoop">{{ isLooping ? '🔁' : '—' }}</button>
    <input class="volume-slider" type="range" min="0" max="1" step="0.01" v-model.number="volume" @input="updateVolume" />
  </div>

  <!-- Canvas pour la waveform -->
  <canvas ref="canvas" class="waveform"></canvas>
</template>

<script lang="ts">
  import { defineComponent, ref, watch } from 'vue';
  import { useAVWaveform } from 'vue-audio-visual';

  export default defineComponent({
    name: 'AudioPlayer',
    props: {
      src: {
        type: String,
        required: true,
      },
    },
    setup(props) {
      const player = ref<HTMLAudioElement | null>(null);
      const canvas = ref<HTMLCanvasElement | null>(null);
      const isPlaying = ref(false);
      const isLooping = ref(false);
      const volume = ref<number>(1); // Par défaut, le volume est au maximum

      const togglePlay = () => {
        if (player.value) {
          if (isPlaying.value) {
            player.value.pause();
          } else {
            player.value.play().catch((err) => {
              console.error('Erreur lors de la lecture audio :', err);
            });
          }
        } else {
          console.error('Player non initialisé.');
        }
      };

      const toggleLoop = () => {
        if (player.value) {
          isLooping.value = !isLooping.value;
          player.value.loop = isLooping.value;
        } else {
          console.error('Player non initialisé.');
        }
      };

      const updateVolume = () => {
        if (player.value) {
          player.value.volume = volume.value;
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
        },
        { immediate: true }
      );

      return {
        player,
        canvas,
        isPlaying,
        isLooping,
        volume,
        togglePlay,
        toggleLoop,
        updateVolume,
      };
    },
  });
</script>
