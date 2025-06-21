<template>
  <div class="relative inline-block">
    <!-- Bouton en forme de roue crantée -->
    <button @click="isOpen = true" class="p-2 rounded-full hover:bg-gray-700 transition-colors">
      <Settings class="w-6 h-6 text-purple-400" />
    </button>

    <!-- Fenêtre modale contenant les options -->
    <div v-if="isOpen" class="fixed inset-0 bg-black/50 flex items-center justify-center z-40">
      <div class="bg-gray-800 p-6 rounded-lg w-80">
        <h3 class="text-purple-300 text-lg font-bold mb-4">Options</h3>
        <div class="flex flex-col gap-3">
          <!-- Lance l'export de la bibliothèque -->
          <button @click="triggerExport" class="px-3 py-2 bg-purple-600 rounded text-white">Exporter</button>
          <!-- Sélecteur de fichier pour l'import -->
          <label class="px-3 py-2 bg-purple-600 rounded text-white text-center cursor-pointer">
            Importer
            <input type="file" class="hidden" @change="onFileChange" />
          </label>
          <button @click="isOpen = false" class="px-3 py-2 bg-gray-600 rounded text-white">Fermer</button>
        </div>
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
  setup() {
    // Etat de visibilité de la modale
    const isOpen = ref(false);
    // Fichier sélectionné pour l'import
    const toImport = ref<File | null>(null);

    // Génère l'archive et déclenche le téléchargement
    async function triggerExport() {
      const blob = await exportLibrary();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'library.mjszip';
      a.click();
      URL.revokeObjectURL(url);
    }

    // Stocke le fichier choisi pour importation
    function onFileChange(e: Event) {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        toImport.value = file;
      }
    }

    // Applique l'import et recharge la page
    async function confirmImport() {
      if (toImport.value) {
        await importLibrary(toImport.value);
        toImport.value = null;
        isOpen.value = false;
        window.location.reload();
      }
    }

    // Données et méthodes exposées au template
    return { isOpen, toImport, triggerExport, onFileChange, confirmImport };
  }
});
</script>
