<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center" @click.self="close">
    <div class="bg-gray-800 p-6 rounded shadow-lg w-72">
      <h2 class="text-lg text-white mb-4">Adresse du backend</h2>
      <input v-model="url" class="w-full px-2 py-1 rounded text-black" placeholder="http://localhost:5000" />
      <div class="flex justify-end mt-4 space-x-2">
        <button @click="save" class="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded">OK</button>
        <button @click="close" class="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded">Annuler</button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { backendUrl, setBackendUrl } from '../models/BackendConfig';
export default defineComponent({
  emits: ['close'],
  setup(_, { emit }) {
    const url = ref(backendUrl.value);
    function close() { emit('close'); }
    function save() {
      setBackendUrl(url.value.trim());
      emit('close');
    }
    return { url, close, save };
  }
});
</script>
