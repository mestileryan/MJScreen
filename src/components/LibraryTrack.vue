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

    <template v-if="isAudio">
      <button class="p-1 rounded-full hover:bg-purple-400/20 transition-colors" @click="copyLink" :disabled="!fileTrack.id">
        <Link class="w-3 h-3 text-purple-300" />
      </button>
      <div class="mr-3 cursor-pointer hover:bg-purple-400/20 rounded-full ml-2" @click="isSelectingIcon = true">
        <svg v-if="fileTrack.iconName" class="w-6 h-6" :style="{ color: fileTrack.iconColor }">
          <use :href="`#${fileTrack.iconName}`" />
        </svg>
        <Music v-else class="w-5 h-5" :style="{ color: fileTrack.iconColor }" />
      </div>
    </template>

    <template v-else>
      <div class="mr-3 ml-2">
        <img :src="imageUrl"
             :alt="galleryImage.name"
             class="w-10 h-10 object-cover rounded"
             @mouseenter="showPreview"
             @mousemove="updatePreview"
             @mouseleave="hidePreview"
             @click="onOpenImage" />
      </div>
    </template>

    <div class="w-full min-w-24 mr-5" @click="startEditing">
      <p v-if="!isEditing" class="text-white font-medium cursor-pointer flex items-center gap-2">
        {{ item.name }}
        <span class="text-gray-400 text-sm">({{ fileSizeInMB }} Mo)</span>
      </p>
      <input v-else
             v-model="editableName"
             class="bg-gray-500 text-white px-2 py-1 rounded w-full focus:outline-none"
             @blur="saveName"
             @keyup.enter="saveName"
             ref="nameInput" />
    </div>

    <template v-if="isAudio">
      <div class="flex">
        <VolumeOff v-if="fileTrack.initialVolume == 0" class="w-5 h-5 text-red-400 mr-3"></VolumeOff>
        <Volume v-else-if="fileTrack.initialVolume <= 0.33" class="w-5 h-5 text-purple-400 mr-3"></Volume>
        <Volume1 v-else-if="fileTrack.initialVolume <= 0.66" class="w-5 h-5 text-purple-400 mr-3"></Volume1>
        <Volume2 v-else class="w-5 h-5 text-purple-400 mr-3"></Volume2>
        <input class="volume-slider" type="range" min="0" max="1" step="0.01" v-model.number="fileTrack.initialVolume" @change="handleVolumeChange" />
      </div>
      <div class="flex items-center gap-1 ml-2">
        <button class="p-1 rounded-full hover:bg-green-400/20 transition-colors" @click="onPlay">
          <Play class="w-5 h-5 text-green-400" />
        </button>
        <button class="p-1 rounded-full hover:bg-blue-400/20 transition-colors"
                @click="toggleLoop">
          <Repeat1 v-if="fileTrack.loop" class="w-5 h-5 text-purple-400" />
          <Repeat1 v-else class="w-5 h-5 text-gray-400" />
        </button>
        <button @click="onRemove" class="p-1 hover:bg-red-700/20 rounded-full transition-colors">
          <Trash2 class="w-5 h-5 text-red-400" />
        </button>
      </div>
    </template>

    <template v-else>
      <div class="flex items-center gap-1 ml-auto">
        <button class="p-1 rounded-full hover:bg-green-400/20 transition-colors" @click="onOpenImage">
          <Play class="w-5 h-5 text-green-400" />
        </button>
        <button @click="onRemove" class="p-1 hover:bg-red-700/20 rounded-full transition-colors">
          <Trash2 class="w-5 h-5 text-red-400" />
        </button>
      </div>
    </template>
  </li>

  <div v-else
       class="track-drag-handle text-white rounded float-left w-12 ml-[2px] mb-[1px] h-12
       flex flex-col items-center justify-center cursor-pointer hover:bg-gray-600
       transition-colors relative"
        :class="dragDisabled ? 'bg-gray-700' : ' bg-gray-600'"
       draggable="true"
       @dragstart="onDragStart"
       @click="isAudio ? onPlay() : onOpenImage()"
       v-tooltip="item.name">
    <template v-if="isAudio">
      <svg v-if="fileTrack.iconName" class="w-10 h-10 mb-1" :style="{ color: fileTrack.iconColor }">
        <use :href="`#${fileTrack.iconName}`" />
      </svg>
      <Music v-else class="w-10 h-10" :style="{ color: fileTrack.iconColor }" />
    </template>
    <template v-else>
      <img :src="imageUrl"
           :alt="galleryImage.name"
           class="w-11 h-11 object-cover rounded"
           @mouseenter.stop="showPreview"
           @mousemove.stop="updatePreview"
           @mouseleave.stop="hidePreview" />
    </template>
  </div>

  <teleport to="body">
    <div v-if="hoverPreview"
         class="pointer-events-none fixed z-50"
         :style="{ top: hoverPreview.y + 'px', left: hoverPreview.x + 'px' }">
      <div class="bg-black/80 p-2 rounded border border-purple-500 shadow-lg">
        <img :src="hoverPreview.url"
             :alt="hoverPreview.name"
             class="max-w-[320px] max-h-[320px] object-contain" />
        <p class="mt-2 text-xs text-gray-200 text-center max-w-[200px] break-words">
          {{ hoverPreview.name }}
        </p>
      </div>
    </div>
  </teleport>

  <div v-if="isAudio && isSelectingIcon"
       class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-gray-800 p-4 rounded shadow-lg w-3/4 max-w-2xl">
      <IconSelector @icon-chosen="onIconChosen"
                    @close="isSelectingIcon = false"
                    :initial-search="fileTrack.iconName"
                    :initial-color="fileTrack.iconColor" />
    </div>
  </div>
</template>

<script lang="ts">
  import { computed, defineComponent, nextTick, ref } from 'vue';
  import { GripVertical, Link, Music, Play, Repeat1, Trash2, Volume, Volume1, Volume2, VolumeOff } from 'lucide-vue-next';
  import type LibraryItem from '@/models/LibraryItem';
  import FileTrack from '@/models/FileTrack';
  import GalleryImage from '@/models/GalleryImage';
  import { DB_UpdateTrack } from '@/persistance/TrackService';
  import { DB_UpdateImage } from '@/persistance/ImageService';
  import IconSelector from './IconSelector.vue';
  import tooltip from '@/directives/tooltip';

  interface HoverPreview {
    url: string;
    name: string;
    x: number;
    y: number;
  }

  export default defineComponent({
    name: 'LibraryItemCard',
    components: {
      IconSelector,
      GripVertical,
      Link,
      Music,
      Play,
      Repeat1,
      Trash2,
      Volume,
      Volume1,
      Volume2,
      VolumeOff,
    },
    props: {
      item: {
        type: Object as () => LibraryItem,
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
    emits: ['remove', 'play-audio', 'open-image'],
    directives: { tooltip },
    setup(props, { emit }) {
      const isEditing = ref(false);
      const isSelectingIcon = ref(false);
      const hoverPreview = ref<HoverPreview | null>(null);
      const editableName = ref(props.item.name);

      const isAudio = computed(() => props.item.kind === 'audio');
      const isImage = computed(() => props.item.kind === 'image');
      const fileTrack = computed(() => props.item as FileTrack);
      const galleryImage = computed(() => props.item as GalleryImage);
      const fileSizeInMB = computed(() => (props.item.file.size / 1024 / 1024).toFixed(2));
      const imageUrl = computed(() => isImage.value ? galleryImage.value.ensureObjectUrl() : undefined);

      const nameInput = ref<HTMLInputElement | null>(null);

      function startEditing() {
        isEditing.value = true;
        editableName.value = props.item.name;
        nextTick(() => {
          nameInput.value?.focus();
        });
      }

      async function saveName() {
        const trimmed = editableName.value.trim();
        if (!trimmed) {
          editableName.value = props.item.name;
          isEditing.value = false;
          return;
        }
        props.item.rename(trimmed);
        editableName.value = props.item.name;
        if (isAudio.value) {
          await DB_UpdateTrack(fileTrack.value);
        } else {
          await DB_UpdateImage(galleryImage.value);
        }
        isEditing.value = false;
      }

      async function handleVolumeChange() {
        if (isAudio.value) {
          await DB_UpdateTrack(fileTrack.value);
        }
      }

      function onRemove() {
        emit('remove', props.item);
      }

      function onPlay() {
        if (isAudio.value) {
          emit('play-audio', fileTrack.value);
        }
      }

      function onOpenImage() {
        if (isImage.value) {
          hidePreview();
          emit('open-image', galleryImage.value);
        }
      }

      function copyLink() {
        if (!isAudio.value) return;
        if (!fileTrack.value.id) return;
        const url = new URL(window.location.href);
        url.searchParams.set('trackId', String(fileTrack.value.id));
        navigator.clipboard.writeText(url.toString());
      }

      async function onIconChosen(payload: { iconName: string; color: string }) {
        if (!isAudio.value) return;
        fileTrack.value.iconName = payload.iconName;
        fileTrack.value.iconColor = payload.color;
        isSelectingIcon.value = false;
        await DB_UpdateTrack(fileTrack.value);
      }

      function onDragStart(e: DragEvent) {
        if (!e.dataTransfer) return;
        e.dataTransfer.setData('application/json', JSON.stringify(props.item));
      }

      async function toggleLoop() {
        if (!isAudio.value) return;
        fileTrack.value.loop = !fileTrack.value.loop;
        await DB_UpdateTrack(fileTrack.value);
      }

      function showPreview(event: MouseEvent) {
        if (!isImage.value) return;
        hoverPreview.value = {
          url: imageUrl.value ?? '',
          name: galleryImage.value.name,
          x: event.clientX + 16,
          y: event.clientY + 16,
        };
      }

      function updatePreview(event: MouseEvent) {
        if (!hoverPreview.value) return;
        hoverPreview.value = {
          ...hoverPreview.value,
          x: event.clientX + 16,
          y: event.clientY + 16,
        };
      }

      function hidePreview() {
        hoverPreview.value = null;
      }

      return {
        isEditing,
        isSelectingIcon,
        hoverPreview,
        editableName,
        isAudio,
        fileTrack,
        galleryImage,
        fileSizeInMB,
        imageUrl,
        nameInput,
        startEditing,
        saveName,
        handleVolumeChange,
        onRemove,
        onPlay,
        onOpenImage,
        copyLink,
        onIconChosen,
        onDragStart,
        toggleLoop,
        showPreview,
        updatePreview,
        hidePreview,
      };
    }
  });
</script>
