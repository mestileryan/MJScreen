<template>
  <li class="flex items-center p-3 rounded-lg bg-gray-700 hover:bg-gray-600 mb-1 shrink-0">
    <!-- Icône musique -->
    <div class="mr-3 cursor-pointer hover:bg-purple-400/20 rounded-full p-1" @click="isSelectingIcon = true">
      <!-- Si trackFile.iconName est défini, on affiche cette icône dynamique -->
      <component v-if="trackFile.iconName"
                 :is="resolveIconComponent(trackFile.iconName)"
                 class="w-5 h-5 text-purple-400" />
      <!-- Sinon, fallback sur l’icône Music (de Lucide) -->
      <Music v-else class="w-5 h-5 text-purple-400" />
    </div>

    <!-- Zone d'affichage / édition du nom -->
    <div class="w-full min-w-24">
      <div v-if="isEditing" class="flex items-center gap-2">
        <input type="text"
               class="font-medium bg-gray-600 text-white p-1 rounded w-full"
               v-model="trackFile.name"
               @keyup.enter="saveName"
               @blur="saveName" />
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

    <!-- Slider volume -->
    <div class="flex">
      <VolumeOff v-if="trackFile.initialVolume == 0" class="w-5 h-5 text-red-400 mr-3"></VolumeOff>
      <Volume v-if="trackFile.initialVolume > 0 && trackFile.initialVolume <= 0.33" class="w-5 h-5 text-purple-400 mr-3"></Volume>
      <Volume1 v-if="trackFile.initialVolume > 0.33 && trackFile.initialVolume <= 0.66" class="w-5 h-5 text-purple-400 mr-3"></Volume1>
      <Volume2 v-if="trackFile.initialVolume > 0.66 && trackFile.initialVolume <= 1" class="w-5 h-5 text-purple-400 mr-3"></Volume2>

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

    <!-- Modal de sélection d’icône, si isSelectingIcon est true -->
    <div v-if="isSelectingIcon"
         class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-gray-800 p-4 rounded shadow-lg w-3/4 max-w-2xl">
        <IconSelector
          @icon-chosen="onIconChosen" 
          @close="isSelectingIcon = false"/>
      </div>
    </div>
  </li>
</template>

<script lang="ts">
  import { defineComponent, defineAsyncComponent, ref, computed } from 'vue';
import * as lucide from 'lucide-vue-next';
import FileTrack from '@/models/FileTrack';
import { DB_UpdateTrack } from '@/persistance/TrackService';
import IconSelector from './IconSelector.vue';
// Import meta.glob pour “resolveIconComponent”
const iconsModules = import.meta.glob('@/assets/game-icons/**/*.svg');
// 1) Construire iconsMap
const iconsMap: Record<string, () => Promise<any>> = {};

Object.keys(iconsModules).forEach((fullPath) => {
  // fullPath = "/src/assets/game-icons/weapons/sword.svg"
  // On enlève le préfixe "/src/assets/game-icons/"
  const baseName = fullPath.split('/').pop()?.replace('.svg', '');
  // baseName = "sword"

  if (baseName) {
    iconsMap[baseName] = iconsModules[fullPath];
  }
});

  export default defineComponent({
  name: 'LibraryTrack',
  components: {
    ...lucide,
    IconSelector
  },
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
    const isSelectingIcon = ref(false);

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

    function resolveIconComponent(iconName: string) {
      // On cherche la fonction de chargement associée
      const loader = iconsMap[iconName];
      if (!loader) return null;

      // Le loader renvoie un import async => on peut
      // soit renvoyer la fonction directement,
      // soit l'importer en mode ?component, etc.

      // Si vous utilisez déjà "?component", vous pouvez faire:
      return defineAsyncComponent(() => loader().then(mod => mod.default));

      // Ou si vous n'êtes pas en ?component, vous créez un composant inline
    }

    // Quand IconSelector émet “icon-chosen”, on met à jour la track
    async function onIconChosen(iconName: string) {
      props.trackFile.iconName = iconName;
      isSelectingIcon.value = false;
      // On peut sauvegarder en DB si on le souhaite
      await DB_UpdateTrack(props.trackFile);
    }
    return {
      isEditing,
      isSelectingIcon,
      fileSizeInMB,
      saveName,
      handleVolumeChange,
      onRemove,
      onPlay,
      onIconChosen,
      resolveIconComponent,
    };
  }
});
</script>
