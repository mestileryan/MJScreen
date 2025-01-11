<template>
  <div>
    <input type="file" accept="audio/*" @change="handleFileChange" />
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
