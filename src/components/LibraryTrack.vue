<template>
  <li v-if="isListView"
      class="flex items-center ml-5 rounded-lg bg-gray-700 hover:bg-gray-600 mb-1 shrink-0">
    <div class="track-drag-handle p-1 mr-2 rounded hover:bg-gray-600/25"
         :class="dragDisabled ? 'cursor-default' : 'cursor-move'"
         draggable="true"
         @dragstart="onDragStart">
      <GripVertical class="w-4 h-4"
                    :class="dragDisabled ? 'text-gray-600' : 'text-gray-400'" />
    </div>
    <div class="mr-3 cursor-pointer hover:bg-purple-400/20 rounded-full p-1" @click="isSelectingIcon = true">
      <svg v-if="trackFile.iconName" class="w-5 h-5" :style="{ color: trackFile.iconColor }">
        <use :href="`#${trackFile.iconName}`" />
      </svg>
      <Music v-else class="w-5 h-5" :style="{ color: trackFile.iconColor }" />
    </div>
    <div class="w-full min-w-24 mr-5" @click="isEditing = true">
      <p v-if="!isEditing" class="text-white font-medium cursor-pointer">
        {{ trackFile.name }}
        <span v-if="!isEditing" class="text-gray-400 text-sm">({{ fileSizeInMB }} Mo)</span>
      </p>
      <input v-if="isEditing"
             v-model="trackFile.name"
             class="bg-gray-500 text-white px-2 py-1 rounded w-full focus:outline-none"
             @blur="saveName"
             @keyup.enter="saveName"
             ref="nameInput" />
    </div>
    <div class="flex">
      <VolumeOff v-if="trackFile.initialVolume == 0" class="w-5 h-5 text-red-400 mr-3"></VolumeOff>
      <Volume v-else-if="trackFile.initialVolume <= 0.33" class="w-5 h-5 text-purple-400 mr-3"></Volume>
      <Volume1 v-else-if="trackFile.initialVolume <= 0.66" class="w-5 h-5 text-purple-400 mr-3"></Volume1>
      <Volume2 v-else class="w-5 h-5 text-purple-400 mr-3"></Volume2>
      <input class="volume-slider" type="range" min="0" max="1" step="0.01" v-model.number="trackFile.initialVolume" @change="handleVolumeChange" />
    </div>
    <div class="flex items-center gap-1 ml-2">
      <button class="p-1 rounded-full hover:bg-green-400/20 transition-colors" @click="onPlay">
        <Play class="w-5 h-5 text-green-400" />
      </button>
      <button class="p-1 rounded-full hover:bg-blue-400/20 transition-colors"
              @click="toggleLoop">
        <Repeat1 v-if="trackFile.loop" class="w-5 h-5 text-purple-400" />
        <Repeat1 v-if="!trackFile.loop" class="w-5 h-5 text-gray-400" />
      </button>
      <button class="p-1 rounded-full hover:bg-purple-400/20 transition-colors" @click="copyLink" :disabled="!trackFile.id">
        <Link class="w-5 h-5 text-purple-300" />
      </button>
      <button @click="onRemove" class="p-1 hover:bg-red-700/20 rounded-full transition-colors">
        <Trash2 class="w-5 h-5 text-red-400" />
      </button>
    </div>
  </li>

  <div v-else
       class="track-drag-handle text-white rounded float-left w-12 ml-[2px] mb-[1px] h-12
       flex flex-col items-center justify-center cursor-pointer hover:bg-gray-600
       transition-colors relative"
        :class="dragDisabled ? 'bg-gray-700' : ' bg-gray-600'" 
       draggable="true"
       @dragstart="onDragStart"
       @click="onPlay"
       v-tooltip="trackFile.name">
    <svg v-if="trackFile.iconName" class="w-10 h-10 mb-1" :style="{ color: trackFile.iconColor }">
      <use :href="`#${trackFile.iconName}`" />
    </svg>
    <Music v-else class="w-10 h-10" :style="{ color: trackFile.iconColor }" />
  </div>

  <!-- Modal de sélection d’icône, si isSelectingIcon est true -->
  <div v-if="isSelectingIcon"
       class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-gray-800 p-4 rounded shadow-lg w-3/4 max-w-2xl">
      <IconSelector @icon-chosen="onIconChosen"
                    @close="isSelectingIcon = false"
                    :initial-search="trackFile.iconName" 
                    :initial-color="trackFile.iconColor" />
    </div>
  </div>
</template>

<script lang="ts">
  import { defineComponent, defineAsyncComponent, ref, computed, nextTick } from 'vue';
  import { GripVertical, Link } from 'lucide-vue-next';
  import FileTrack from '@/models/FileTrack';
  import { DB_UpdateTrack } from '@/persistance/TrackService';
  import IconSelector from './IconSelector.vue';
  import tooltip from '@/directives/tooltip';


  export default defineComponent({
    //name: 'LibraryTrack',
    components: {
      IconSelector,
      GripVertical,
      Link,
    },
    props: {
      trackFile: {
        type: Object as () => FileTrack,
        required: true
      },
      isListView: {
        type: Boolean,
        required: true
      },
      dragDisabled: {
        type: Boolean,
        default: false,
      }
    },
    emits: ['remove-file', 'play'],
    directives: { tooltip },
    setup(props, { emit }) {
      const spriteHref = new URL('@/assets/icon-sprite.svg', import.meta.url).href;
      const isEditing = ref(false);
      const isSelectingIcon = ref(false);
      const fileSizeInMB = computed(() => (props.trackFile.file.size / 1024 / 1024).toFixed(2));

      const nameInput = ref<HTMLInputElement | null>(null);

      function startEditing() {
        isEditing.value = true;
        nextTick(() => {
          nameInput.value?.focus();
        });
      }

      async function saveName() {
        await DB_UpdateTrack(props.trackFile);
        isEditing.value = false;
      }

      async function handleVolumeChange() {
        await DB_UpdateTrack(props.trackFile);
      }

      function onRemove() {
        emit('remove-file', props.trackFile);
      }

      function onPlay() {
        emit('play', props.trackFile);
      }

      // Copy a direct link to this track in the clipboard
      function copyLink() {
        if (!props.trackFile.id) return;
        const url = new URL(window.location.href);
        url.searchParams.set('trackId', String(props.trackFile.id));
        navigator.clipboard.writeText(url.toString());
      }

      async function onIconChosen(payload: { iconName: string; color: string }) {
        props.trackFile.iconName = payload.iconName;
        props.trackFile.iconColor = payload.color;
        isSelectingIcon.value = false;
        await DB_UpdateTrack(props.trackFile);
      }

      function onDragStart(e: DragEvent) {
        if (!e.dataTransfer) return;
        // On met la track en JSON
        e.dataTransfer.setData('application/json', JSON.stringify(props.trackFile));
      }

      async function toggleLoop() {
        props.trackFile.loop = !props.trackFile.loop;
        await DB_UpdateTrack(props.trackFile);
      }

      return {
        startEditing,
        isEditing,
        isSelectingIcon,
        fileSizeInMB,
        saveName,
        handleVolumeChange,
        onRemove,
        onPlay,
        copyLink,
        onIconChosen,
        onDragStart,
        spriteHref,
        toggleLoop,
      };
    }
  });
</script>
