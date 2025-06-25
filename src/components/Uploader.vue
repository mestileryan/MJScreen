<template>
    <label class="w-8 cursor-pointer bg-purple-600 hover:bg-purple-500 px-2 py-1
            rounded-lg flex items-center gap-2 transition-colors justify-center">

      <Plus/>
      <input type="file"
              accept="audio/*"
              @change="handleFileChange"
              class="hidden" />
    </label>
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
