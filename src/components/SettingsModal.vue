<template>
  <div class="relative">

    <!-- Fenêtre modale contenant les options -->
    <div v-if="isOpen" class="fixed inset-0 bg-black/50 flex items-center justify-center z-40">
      <div class="bg-gray-800 p-6 rounded-lg w-80">
        <div class="flex items-center justify-between">

          <h3 class="text-purple-300 text-lg font-bold mb-4">Paramétrage</h3>
          <button class="px-3 py-2 mb-4 rounded text-white hover:text-red-400 transition-colors"
                  @click="$emit('close')">
            <CircleX />
          </button>
        </div>
        <div class="flex flex-col gap-3">
          <!-- Lance l'export de la bibliothèque -->
          <button @click="triggerExport" class="px-3 py-2 bg-purple-600 hover:bg-purple-500 rounded text-white">Exporter</button>
          <!-- Sélecteur de fichier pour l'import -->
          <label class="px-3 py-2 bg-purple-600 hover:bg-purple-500 rounded text-white text-center cursor-pointer">
            Importer
            <input type="file" class="hidden" @change="onFileChange" />
          </label>
        </div>

        <!-- Affichage d'une erreur -->
        <p v-if="errorMessage"
           class="mt-4 text-sm text-red-400 bg-red-900/30 px-3 py-2 rounded border border-red-500">
          {{ errorMessage }}
        </p>
      </div>
    </div>

    <!-- Modale de confirmation avant l'import -->
    <ConfirmationModal
      v-if="toImport"
      :message="'Importer ce fichier écrasera tout le travail en cours. Continuer ?'"
      @confirm="confirmImport"
      @cancel="toImport = null"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { exportLibrary, importLibrary } from '@/persistance/ImportExportService';
import ConfirmationModal from './ConfirmationModal.vue';

export default defineComponent({
  name: 'SettingsModal',
  components: { ConfirmationModal },
  props: {
    isOpen: { type: Boolean, required: true }
  },
  emits: ['close'],
  setup(props, { emit }) {
    // Fichier sélectionné pour l'import
    const toImport = ref<File | null>(null);
    const errorMessage = ref<string | null>(null);

    // Génère l'archive et déclenche le téléchargement
    async function triggerExport() {
      errorMessage.value = null;
      try {
        const blob = await exportLibrary();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'library.mjszip';
        a.click();
        URL.revokeObjectURL(url);

      } catch (e: any) {
        errorMessage.value = "Erreur lors de l'export : " + (e?.message || 'inconnue');
      }
    }

    // Stocke le fichier choisi pour importation
    function onFileChange(e: Event) {
      errorMessage.value = null;
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        toImport.value = file;
      }
    }

    // Applique l'import et recharge la page
    async function confirmImport() {
      if (toImport.value) {
        errorMessage.value = null;
        try {
          await importLibrary(toImport.value);
          toImport.value = null;
          emit('close');
          window.location.reload();
        } catch (e: any) {
          errorMessage.value = "Erreur lors de l'import : " + (e?.message || 'inconnue');
        }
      }
    }

    // Données et méthodes exposées au template
    return {
      errorMessage,
      toImport,
      triggerExport,
      onFileChange,
      confirmImport
    };
  }
});
</script>
