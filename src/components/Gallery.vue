<template>
  <div
    class="w-full bg-gray-800 rounded-lg p-4 pt-2 mb-6"
    @dragover.prevent
    @drop.prevent="handleFilesDropped($event.dataTransfer?.files)"
  >
    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      multiple
      class="hidden"
      @change="onFileSelected"
    />

    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <h2 class="text-xl font-bold text-purple-300">Galerie</h2>
        <button
          class="p-2 rounded bg-purple-600 hover:bg-purple-500 text-white transition-colors"
          @click="openFileDialog"
        >
          <Plus class="w-4 h-4" />
        </button>
      </div>
      <button
        class="flex items-center gap-2 px-3 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
        @click="openPresentation"
      >
        <MonitorPlay class="w-4 h-4" />
        <span>Présenter</span>
      </button>
    </div>

    <div class="border border-dashed border-gray-600 rounded p-4 min-h-[100px] relative">
      <draggable
        v-model="images"
        item-key="id"
        class="flex flex-wrap gap-6"
        :animation="250"
        @end="saveOrder"
      >
        <template #item="{ element }">
          <div
            class="flex flex-col items-center gap-1 text-center relative"
            @mouseenter="showPreview(element, $event)"
            @mousemove="updatePreviewPosition($event)"
            @mouseleave="hidePreview"
            @click="sendToPresentation(element)"
          >
            <button
              class="absolute -top-2 -right-2 bg-red-700 text-white rounded-full p-1 hover:bg-red-600"
              title="Supprimer"
              @click.stop="removeImage(element)"
            >
              <Trash2 class="w-3 h-3" />
            </button>
            <img
              :src="ensureObjectUrl(element)"
              :alt="element.name"
              class="max-w-[20px] max-h-[20px] object-contain"
            />
            <span class="text-xs text-gray-300 break-all max-w-[80px]">{{ element.name }}</span>
          </div>
        </template>
        <template #footer>
          <p
            v-if="!images.length"
            class="text-sm text-gray-400"
          >
            Déposez vos images ici ou utilisez le bouton +.
          </p>
        </template>
      </draggable>
    </div>

    <div
      v-if="hoverPreview"
      class="pointer-events-none fixed z-50"
      :style="{
        top: hoverPreview.y + 'px',
        left: hoverPreview.x + 'px'
      }"
    >
      <div class="bg-black/80 p-2 rounded border border-purple-500 shadow-lg">
        <img
          :src="hoverPreview.url"
          :alt="hoverPreview.name"
          class="max-w-[200px] max-h-[200px] object-contain"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import draggable from 'vuedraggable';
import GalleryImage from '@/models/GalleryImage';
import { DB_AddImage, DB_GetImages, DB_RemoveImage, DB_UpdateImages } from '@/persistance/ImageService';
import { MonitorPlay, Plus, Trash2 } from 'lucide-vue-next';

interface HoverPreview {
  url: string;
  name: string;
  x: number;
  y: number;
}

export default defineComponent({
  name: 'Gallery',
  components: { draggable, MonitorPlay, Plus, Trash2 },
  setup() {
    const images = ref<GalleryImage[]>([]);
    const fileInput = ref<HTMLInputElement | null>(null);
    const hoverPreview = ref<HoverPreview | null>(null);
    const presentationWindow = ref<Window | null>(null);

    async function loadImages() {
      images.value = await DB_GetImages();
      images.value.forEach(img => ensureObjectUrl(img));
    }

    onMounted(() => {
      loadImages();
    });

    onBeforeUnmount(() => {
      images.value.forEach(revokeObjectUrl);
      hoverPreview.value = null;
    });

    function openFileDialog() {
      fileInput.value?.click();
    }

    function ensureObjectUrl(image: GalleryImage): string {
      if (!image.objectUrl) {
        image.objectUrl = URL.createObjectURL(image.file);
      }
      return image.objectUrl;
    }

    function revokeObjectUrl(image: GalleryImage) {
      if (image.objectUrl) {
        URL.revokeObjectURL(image.objectUrl);
        image.objectUrl = undefined;
      }
    }

    async function addFiles(files: FileList | null | undefined) {
      if (!files?.length) return;

      const currentMaxOrder = images.value.reduce((max, img) => Math.max(max, img.order ?? 0), -1);
      let order = currentMaxOrder + 1;

      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue;
        const img = new GalleryImage(file);
        img.order = order++;
        await DB_AddImage(img);
        ensureObjectUrl(img);
        images.value.push(img);
      }
      images.value.sort((a, b) => a.order - b.order);
    }

    function onFileSelected(event: Event) {
      const target = event.target as HTMLInputElement;
      addFiles(target.files);
      target.value = '';
    }

    function handleFilesDropped(files: FileList | null | undefined) {
      addFiles(files);
    }

    function showPreview(image: GalleryImage, event: MouseEvent) {
      hoverPreview.value = reactive({
        url: ensureObjectUrl(image),
        name: image.name,
        x: event.clientX + 16,
        y: event.clientY + 16,
      });
    }

    function updatePreviewPosition(event: MouseEvent) {
      if (!hoverPreview.value) return;
      hoverPreview.value.x = event.clientX + 16;
      hoverPreview.value.y = event.clientY + 16;
    }

    function hidePreview() {
      hoverPreview.value = null;
    }

    async function removeImage(image: GalleryImage) {
      await DB_RemoveImage(image);
      const index = images.value.indexOf(image);
      if (index >= 0) {
        images.value.splice(index, 1);
      }
      revokeObjectUrl(image);
      await saveOrder();
    }

    async function saveOrder() {
      images.value.forEach((img, index) => {
        img.order = index;
      });
      await DB_UpdateImages(images.value);
    }

    function getPresentationWindow(): Window | null {
      if (presentationWindow.value && presentationWindow.value.closed) {
        presentationWindow.value = null;
      }
      if (!presentationWindow.value) {
        presentationWindow.value = window.open('/gallery-viewer.html', 'gallery-viewer', 'width=800,height=600');
      }
      return presentationWindow.value;
    }

    function openPresentation() {
      getPresentationWindow()?.focus();
    }

    function sendToPresentation(image: GalleryImage) {
      const win = getPresentationWindow();
      if (!win) return;
      win.postMessage({ type: 'display-image', url: ensureObjectUrl(image), name: image.name }, window.location.origin);
    }

    return {
      images,
      fileInput,
      hoverPreview,
      openFileDialog,
      ensureObjectUrl,
      handleFilesDropped,
      onFileSelected,
      showPreview,
      updatePreviewPosition,
      hidePreview,
      removeImage,
      saveOrder,
      openPresentation,
      sendToPresentation,
    };
  },
});
</script>
