<template>
  <li v-if="isListView"
      class="flex items-center p-3 rounded-lg bg-gray-700 hover:bg-gray-600 mb-1 shrink-0"
      draggable="true"
      @dragstart="onDragStart"
      >
    <div class="mr-3 cursor-pointer hover:bg-purple-400/20 rounded-full p-1" @click="isSelectingIcon = true">
      <component v-if="trackFile.iconName" :is="resolveIconComponent(trackFile.iconName)" class="w-5 h-5 text-purple-400" />
      <Music v-else class="w-5 h-5 text-purple-400" />
    </div>
    <div class="w-full min-w-24" @click="isEditing = true">
      <p class="text-white font-medium" :title="trackFile.file.name">{{ trackFile.name }}</p>
      <p class="text-gray-400 text-sm">({{ fileSizeInMB }} Mo)</p>
    </div>
    <div class="flex">
      <VolumeOff v-if="trackFile.initialVolume == 0" class="w-5 h-5 text-red-400 mr-3"></VolumeOff>
      <Volume v-else-if="trackFile.initialVolume <= 0.33" class="w-5 h-5 text-purple-400 mr-3"></Volume>
      <Volume1 v-else-if="trackFile.initialVolume <= 0.66" class="w-5 h-5 text-purple-400 mr-3"></Volume1>
      <Volume2 v-else class="w-5 h-5 text-purple-400 mr-3"></Volume2>
      <input class="volume-slider" type="range" min="0" max="1" step="0.01" v-model.number="trackFile.initialVolume" @change="handleVolumeChange" />
    </div>
    <div class="flex items-center gap-1 ml-2">
      <button class="p-2 rounded-full hover:bg-green-400/20 transition-colors" @click="onPlay">
        <Play class="w-5 h-5 text-green-400" />
      </button>
      <button @click="onRemove" class="p-2 hover:bg-red-700/20 rounded-full transition-colors">
        <Trash2 class="w-5 h-5 text-red-400" />
      </button>
    </div>
  </li>

  <div v-else
       class="bg-gray-700 text-white rounded float-left w-20 m-1 h-20 
       flex flex-col items-center justify-center cursor-pointer hover:bg-gray-600
       transition-colors relative"
       @click="onPlay"
       :title="trackFile.name">
    <component v-if="trackFile.iconName" :is="resolveIconComponent(trackFile.iconName)" class="w-8 h-8 text-purple-400 mb-1" />
    <Music v-else class="w-8 h-8 text-purple-400" />
    <p class="text-xs mt-1 text-center">{{ trackFile.name.length > 10 ? trackFile.name.substring(0, 10) + '...' : trackFile.name }}</p>
  </div>

  <!-- Modal de sélection d’icône, si isSelectingIcon est true -->
  <div v-if="isSelectingIcon"
       class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-gray-800 p-4 rounded shadow-lg w-3/4 max-w-2xl">
      <IconSelector @icon-chosen="onIconChosen"
                    @close="isSelectingIcon = false" />
    </div>
  </div>
</template>

<script lang="ts">
  import { defineComponent, defineAsyncComponent, ref, computed } from 'vue';
  import FileTrack from '@/models/FileTrack';
  import { DB_UpdateTrack } from '@/persistance/TrackService';
  import IconSelector from './IconSelector.vue';
  const iconsModules = import.meta.glob('@/assets/game-icons/**/*.svg');
  const iconsMap: Record<string, () => Promise<any>> = {};
  Object.keys(iconsModules).forEach((fullPath) => {
    const baseName = fullPath.split('/').pop()?.replace('.svg', '');
    if (baseName) {
      iconsMap[baseName] = iconsModules[fullPath];
    }
  });

  export default defineComponent({
    //name: 'LibraryTrack',
    components: {
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
      },
      isListView: {
        type: Boolean,
        required: true
      }
    },
    emits: ['remove-file', 'play'],
    setup(props, { emit }) {
      const isEditing = ref(false);
      const isSelectingIcon = ref(false);
      const fileSizeInMB = computed(() => (props.trackFile.file.size / 1024 / 1024).toFixed(2));


      async function saveName() {
        await DB_UpdateTrack(props.trackFile);
        isEditing.value = false;
      }

      async function handleVolumeChange() {
        await DB_UpdateTrack(props.trackFile);
      }

      function onRemove() {
        emit('remove-file', props.index);
      }

      function onPlay() {
        emit('play', props.index);
      }

      function resolveIconComponent(iconName: string) {
        const loader = iconsMap[iconName];
        if (!loader) return null;
        return defineAsyncComponent(() => loader().then(mod => mod.default));
      }

      async function onIconChosen(iconName: string) {
        props.trackFile.iconName = iconName;
        isSelectingIcon.value = false;
        await DB_UpdateTrack(props.trackFile);
      }

      function onDragStart(e: DragEvent) {
        if (!e.dataTransfer) return;
        // On met la track en JSON
        e.dataTransfer.setData('application/json', JSON.stringify(props.trackFile));
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
        onDragStart,
      };
    }
  });
</script>
