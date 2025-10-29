<template>
  <div class="w-full bg-gray-800 rounded-lg p-4 pt-2 mb-6"
       @dragover.prevent
       @drop.prevent="handleFilesDropped($event.dataTransfer?.files)">
    <input ref="fileInput"
           type="file"
           accept="image/*"
           multiple
           class="hidden"
           @change="onFileSelected" />

    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <h2 class="text-xl font-bold text-purple-300">Galerie</h2>
        <button class="w-8 cursor-pointer bg-purple-600 hover:bg-purple-500 px-2 py-2 rounded-lg flex items-center gap-2 transition-colors justify-center"
                @click="openFileDialog">
          <Plus class="w-4 h-4" />
        </button>
      </div>
      <button class="flex items-center gap-2 px-3 py-2 rounded text-white transition-colors "
              :class="isPresentationOpen
          ? 'bg-emerald-900 cursor-not-allowed opacity-60'
          : 'bg-emerald-600 hover:bg-emerald-500'"
              :disabled="isPresentationOpen"
              @click="openPresentation">
        <MonitorPlay class="w-4 h-4" />
        <span>Présenter</span>
      </button>
    </div>

    <div class="border border-dashed border-gray-600 rounded p-4 min-h-[100px] relative">
      <draggable v-model="images"
                 item-key="id"
                 class="flex flex-wrap gap-2"
                 :animation="250"
                 @end="saveOrder">
        <template #item="{ element }">
          <div class="p-2 flex flex-col items-center gap-1 text-center relative hover:bg-gray-500 transition-colors"
>
            <button class="absolute -top-2 -right-2 text-white rounded-full p-1 hover:bg-red-600 hover:bg-red-700/20 transition-colors cursor-pointer"
                    title="Supprimer"
                    @click.stop="removeImage(element)">
              <Trash2 class="w-3 h-3 text-red-400" />
            </button>
            <img :src="ensureObjectUrl(element)"

              :alt="element.name"
              class="max-w-[40px] max-h-[40px] object-contain cursor-pointer"
              @mouseenter="showPreview(element, $event)"
              @mousemove="updatePreviewPosition($event)"
              @mouseleave="hidePreview"
              @click="sendToPresentation(element)"
                 />
            <button v-if="editingImage !== element"
                    class="text-xs text-gray-300 break-all max-w-[80px] caret-cursor hover:text-white"
                    :title="element.name"
                    @click.stop="startEditing(element)">
              {{ getDisplayName(element) }}
            </button>
            <input v-else
                   v-model="element.name"
                   class="text-xs text-white bg-gray-700 rounded px-1 py-0.5 max-w-[80px] focus:outline-none"
                   :title="element.name"
                   @blur="saveImageName(element)"
                   @keyup.enter="saveImageName(element)"
                   @keyup.esc="cancelEditing()"
                   @click.stop
                   :ref="el => setNameInputRef(element, el)" />
          </div>
        </template>
        <template #footer>
          <p v-if="!images.length"
             class="text-sm text-gray-400">
            Déposez vos images ici ou utilisez le bouton +.
          </p>
        </template>
      </draggable>
    </div>

    <div v-if="hoverPreview"
         class="pointer-events-none fixed z-50"
         :style="{
        top: hoverPreview.y + 'px',
        left: hoverPreview.x + 'px'
      }">
      <div class="bg-black/80 p-2 rounded border border-purple-500 shadow-lg">
        <img :src="hoverPreview.url"
             :alt="hoverPreview.name"
             class="max-w-[500px] max-h-[500px] object-contain" />
        <p class="mt-2 text-xs text-gray-200 text-center max-w-[200px] break-words">
          {{ hoverPreview.name }}
        </p>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
  import { defineComponent, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
  import type { ComponentPublicInstance } from 'vue';
  import draggable from 'vuedraggable';
  import GalleryImage from '@/models/GalleryImage';
  import { DB_AddImage, DB_GetImages, DB_RemoveImage, DB_UpdateImage, DB_UpdateImages } from '@/persistance/ImageService';
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
      const isPresentationOpen = ref(false);
      let presentationWindowMonitor: number | null = null;
      const editingImage = ref<GalleryImage | null>(null);
      const editingOriginalName = ref('');
      const nameInputRefs = new WeakMap<GalleryImage, HTMLInputElement>();

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
        stopPresentationWindowMonitor();
        presentationWindow.value?.removeEventListener('beforeunload', handlePresentationClosed);
        presentationWindow.value = null;
        isPresentationOpen.value = false;
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
        hidePreview();
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

      function stopPresentationWindowMonitor() {
        if (presentationWindowMonitor !== null) {
          window.clearInterval(presentationWindowMonitor);
          presentationWindowMonitor = null;
        }
      }

      function handlePresentationClosed() {
        stopPresentationWindowMonitor();
        if (presentationWindow.value) {
          presentationWindow.value.removeEventListener('beforeunload', handlePresentationClosed);
        }
        presentationWindow.value = null;
        isPresentationOpen.value = false;
      }

      function ensurePresentationWindow(): Window | null {
        if (presentationWindow.value && !presentationWindow.value.closed) {
          isPresentationOpen.value = true;
          return presentationWindow.value;
        }

        const newWindow = window.open('/MJScreen/gallery-viewer.html', 'gallery-viewer', 'width=800,height=600');
        if (!newWindow) {
          handlePresentationClosed();
          return null;
        }

        presentationWindow.value = newWindow;
        isPresentationOpen.value = true;
        presentationWindow.value.addEventListener('beforeunload', handlePresentationClosed);
        presentationWindowMonitor = window.setInterval(() => {
          if (presentationWindow.value?.closed) {
            handlePresentationClosed();
          }
        }, 500);

        return presentationWindow.value;
      }

      function openPresentation() {
        ensurePresentationWindow()?.focus();
      }

      function sendToPresentation(image: GalleryImage) {
        if (!isPresentationOpen.value) {
          return;
        }
        const win = presentationWindow.value;
        if (!win || win.closed) {
          handlePresentationClosed();
          return;
        }
        win.postMessage({ type: 'display-image', url: ensureObjectUrl(image), name: image.name }, window.location.origin);
      }

      function getDisplayName(image: GalleryImage): string {
        if (image.name.length > 20) {
          return image.name.slice(0, 20) + '…';
        }
        return image.name;
      }

      function startEditing(image: GalleryImage) {
        editingImage.value = image;
        editingOriginalName.value = image.name;
        nextTick(() => {
          const input = nameInputRefs.get(image);
          input?.focus();
          input?.select();
        });
      }

      async function saveImageName(image: GalleryImage) {
        const trimmed = image.name.trim();
        image.name = trimmed || editingOriginalName.value || image.file.name;
        editingImage.value = null;
        editingOriginalName.value = '';
        await DB_UpdateImage(image);
      }

      function cancelEditing() {
        if (editingImage.value) {
          editingImage.value.name = editingOriginalName.value;
        }
        editingImage.value = null;
        editingOriginalName.value = '';
      }

      function setNameInputRef(image: GalleryImage, el: Element | ComponentPublicInstance | null) {
        if (el instanceof HTMLInputElement) {
          nameInputRefs.set(image, el);
        }
      }

      return {
        images,
        fileInput,
        hoverPreview,
        editingImage,
        isPresentationOpen,
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
        getDisplayName,
        startEditing,
        saveImageName,
        cancelEditing,
        setNameInputRef,
      };
    },
  });
</script>
