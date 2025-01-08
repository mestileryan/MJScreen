<template>
  <!-- Uploader pour gérer l'upload -->
  <Uploader @file-selected="handleFileSelected" />

  <!-- Player audio -->
  <audio ref="player" :src="audioUrl" />

  <!-- Boutons Play/Pause -->
  <button @click="playAudio">Play</button>
  <button @click="pauseAudio">Pause</button>

  <!-- Canvas pour la waveform -->
  <canvas ref="canvas"></canvas>

</template>

<script lang="ts">
  import { defineComponent, ref, onMounted } from 'vue';
  import Uploader from './Uploader.vue';
  import { useAVWaveform } from 'vue-audio-visual';

  // Références globales accessibles partout
  const player = ref<HTMLAudioElement | null>(null);
  const canvas = ref<HTMLCanvasElement | null>(null);
  const audioUrl = ref<string | null>(null);

  // Gère la sélection du fichier
  const handleFileSelected = (file: File) => {
    // Libère l'ancienne URL si elle existe
    if (audioUrl.value) {
      URL.revokeObjectURL(audioUrl.value);
    }

    // Crée une nouvelle URL
    audioUrl.value = URL.createObjectURL(file);

    // Initialise la waveform
    if (player.value && canvas.value) {
      useAVWaveform(player, canvas, {
        src: audioUrl.value,
        playtimeWithMs: false,
      });
    } else {
      console.error('Player ou Canvas non initialisé.');
    }
  };

  // Lecture audio
  const playAudio = () => {
    if (player.value) {
      player.value.play().catch((err) => {
        console.error('Erreur lors de la lecture audio :', err);
      });
    } else {
      console.error('Player non initialisé.');
    }
  };

  // Pause audio
  const pauseAudio = () => {
    if (player.value) {
      player.value.pause();
    } else {
      console.error('Player non initialisé.');
    }
  };
  export default defineComponent({
    name: 'HelloWorld',
    components: {
      Uploader,
    },
    setup() {
      player.value = document.querySelector('[ref="player"]') as HTMLAudioElement;
      canvas.value = document.querySelector('[ref="canvas"]') as HTMLCanvasElement;

      // Retourne les fonctions pour le template
      return {
        player,
        canvas,
        audioUrl,
        handleFileSelected,
        playAudio,
        pauseAudio,
      };
    },
  });
</script>

<style scoped>
  /* Styles optionnels */
</style>
