<template>
  <li class="flex items-center justify-between p-3 rounded-lg bg-gray-700 hover:bg-gray-600 mb-1">
    <!-- Icône musique -->
    <Music class="w-5 h-5 text-purple-400 mr-3" />

    <!-- Zone d'affichage / édition du nom -->
    <div>
      <div v-if="isEditing" class="flex items-center gap-2">
        <input
          type="text"
          class="font-medium bg-gray-600 text-white p-1 rounded w-full"
          v-model="trackFile.name"
          @keyup.enter="saveName"
          @blur="saveName"
        />
      </div>
      <div v-else @click="isEditing = true">
        <p class="text-white font-medium" :title="trackFile.file.name">
          {{ trackFile.name }}
        </p>
        <p class="text-gray-400 text-sm">
          ({{ fileSizeInMB }} Mo)
        </p>
      </div>
    </div>

    <div class="flex">
      <VolumeOff v-if="trackFile.initialVolume == 0" class="w-5 h-5 text-red-400 mr-3"></VolumeOff>
      <Volume v-if="trackFile.initialVolume > 0 && trackFile.initialVolume <= 0.33" class="w-5 h-5 text-purple-400 mr-3"></Volume>
      <Volume1 v-if="trackFile.initialVolume > 0.33 && trackFile.initialVolume <= 0.66" class="w-5 h-5 text-purple-400 mr-3"></Volume1>
      <Volume2 v-if="trackFile.initialVolume > 0.66 && trackFile.initialVolume <= 1" class="w-5 h-5 text-purple-400 mr-3"></Volume2>
      <!-- Slider volume -->
      <input class="volume-slider"
             type="range"
             min="0"
             max="1"
             step="0.01"
             v-model.number="trackFile.initialVolume"
             @change="handleVolumeChange" />
    </div>

    <!-- Boutons d’action -->
    <div class="flex items-center gap-1 ml-2">
      <button class="p-2 rounded-full hover:bg-green-400/20 transition-colors" @click="onPlay">
        <Play class="w-5 h-5 text-green-400" />
      </button>
      <button @click="onRemove" class="p-2 hover:bg-red-700/20 rounded-full transition-colors">
        <Trash2 class="w-5 h-5 text-red-400" />
      </button>
    </div>
  </li>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from 'vue';
import * as lucide from 'lucide-vue-next';
import FileTrack from '@/models/FileTrack';
import { DB_UpdateTrack } from '@/persistance/TrackService';

export default defineComponent({
  name: 'LibraryTrack',
  components: lucide,
  props: {
    trackFile: {
      type: Object as () => FileTrack,
      required: true
    },
    index: {
      type: Number,
      required: true
    }
  },
  emits: ['remove-file', 'play'],
  setup(props, { emit }) {
    const isEditing = ref(false);

    // Calcul de la taille en Mo, juste pour l'affichage
    const fileSizeInMB = computed(() => {
      return (props.trackFile.file.size / 1024 / 1024).toFixed(2);
    });

    /**
     * Sauvegarde le nouveau nom
     */
    async function saveName() {
      // On met à jour la base
      await DB_UpdateTrack(props.trackFile);
      // On quitte le mode édition
      isEditing.value = false;
    }

    /**
     * Sauvegarde le volume en DB quand on change le slider
     */
    async function handleVolumeChange() {
      await DB_UpdateTrack(props.trackFile);
    }

    /**
     * Demande au parent de supprimer cette piste
     */
    function onRemove() {
      emit('remove-file', props.index);
    }

    /**
     * Demande au parent de jouer cette piste
     */
    function onPlay() {
      emit('play', props.index);
    }

    return {
      isEditing,
      fileSizeInMB,
      saveName,
      handleVolumeChange,
      onRemove,
      onPlay
    };
  }
});
</script>
