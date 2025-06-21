<template>
  <!-- Arrière-plan semi-transparent bloquant -->
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div class="bg-gray-800 p-6 rounded-lg w-80 text-center">
      <p class="text-white mb-4">{{ message }}</p>
      <div class="flex justify-end gap-2">
        <button @click="$emit('cancel')" class="px-3 py-1 bg-gray-600 rounded text-white">Annuler</button>
        <button @click="$emit('confirm')" class="px-3 py-1 bg-purple-600 rounded text-white">Confirmer</button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

// Composant affichant une boîte de dialogue de confirmation générique
export default defineComponent({
  name: 'ConfirmationModal',
  props: {
    message: { type: String, required: true }
  },
  emits: ['confirm', 'cancel']
});
</script>
