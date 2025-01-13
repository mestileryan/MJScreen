<template>
  <div>
    <div className="w-96 bg-gray-600 p-6 flex flex-col justify-between border-l border-gray-700">
      <label className="cursor-pointer bg-purple-500 hover:bg-purple-600 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors w-full justify-center">

        <span>Import</span>
        <input type="file"
               accept="audio/*"
               @change="handleFileChange"
               className="hidden" />
      </label>
    </div>
  </div>
</template>

<script lang="ts">
  import { defineComponent } from 'vue';

  export default defineComponent({
    name: 'Uploader',
    // On remplace `methods` par une fonction `setup()`
    setup(_, { emit }) {
      const handleFileChange = (event: Event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (file) {
          emit('file-selected', file);
        }
      };

      // On retourne ce qu'on veut exposer au template
      return {
        handleFileChange
      };
    }
  });
</script>
