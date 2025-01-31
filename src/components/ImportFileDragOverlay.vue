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
         class="absolute inset-0 flex justify-center
             transition-all duration-300">
      <div class="border-4 border-dashed bg-black bg-opacity-75 w-[80vw] h-[80vh] border-white rounded-lg p-10 text-white text-xl font-semibold text-center">
        Déposez votre fichier ici
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';

export default defineComponent({
  name: 'ImportFileDragOverlay',
  // On émet un événement lorsqu'on drop des fichiers
  emits: ['files-dropped'],
  setup(props, { emit }) {
    const isDragOver = ref(false);
    const dragCounter = ref(0);

    function onDragEnter(event: DragEvent) {
      if (event.dataTransfer?.items && Array.from(event.dataTransfer.items).some(item => item.kind === "file")) {
        dragCounter.value++; // Augmente le compteur
        isDragOver.value = true;
      }
    }

    function onDragOver(event: DragEvent) {
      if (event.dataTransfer?.items && !Array.from(event.dataTransfer.items).some(item => item.kind === "file")) {
        return;
      }
      event.preventDefault(); // Permet de conserver le drag actif
    }

    function onDragLeave(event: DragEvent) {
      dragCounter.value--; // Décrémente le compteur
      if (dragCounter.value === 0) {
        isDragOver.value = false; // Cache l'overlay uniquement si on quitte complètement la zone
      }
    }

    function onDrop(event: DragEvent) {
      dragCounter.value = 0; // Reset du compteur
      isDragOver.value = false;

      if (event.dataTransfer?.files?.length) {
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
