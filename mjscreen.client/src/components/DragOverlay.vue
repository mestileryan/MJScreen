<template>
  <!--
    On place le wrapper en "relative" pour que l'overlay absolu
    puisse se positionner par-dessus.
  -->
  <div class="relative"
       @dragenter.prevent="onDragEnter"
       @dragover.prevent="onDragOver"
       @dragleave.prevent="onDragLeave"
       @drop.prevent="onDrop">
    <!-- Le contenu que l'on "englobe" sera rendu ici : -->
    <slot />

    <!-- Overlay semi-transparent (s'affiche uniquement si `isDragOver`) -->
    <div v-if="isDragOver"
         class="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center
             transition-all duration-300">
      <div class="border-4 border-dashed border-white rounded-lg p-8 text-white text-xl font-semibold text-center">
        Déposez votre fichier ici
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';

export default defineComponent({
  name: 'DragOverlay',
  // On émet un événement lorsqu'on drop des fichiers
  emits: ['files-dropped'],
  setup(props, { emit }) {
    const isDragOver = ref(false);
    const dragCounter = ref(0);

    function onDragEnter() {
      dragCounter.value++;
      isDragOver.value = true;
    }

    function onDragOver() {
      // On peut forcer isDragOver = true ici,
      // mais en général on s'appuie sur onDragEnter().
    }

    function onDragLeave() {
      dragCounter.value--;
      if (dragCounter.value === 0) {
        isDragOver.value = false;
      }
    }

    function onDrop(event: DragEvent) {
      dragCounter.value = 0;
      isDragOver.value = false;

      // Récupérer les fichiers déposés
      if (event.dataTransfer?.files?.length) {
        // On émet un tableau de fichiers
        emit('files-dropped', Array.from(event.dataTransfer.files));
      }
    }

    return {
      isDragOver,
      onDragEnter,
      onDragOver,
      onDragLeave,
      onDrop
    };
  }
});
</script>
