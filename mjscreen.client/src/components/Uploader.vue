<template>
  <div>
    <input type="file" accept="audio/*" @change="handleFileChange" />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  methods: {
    handleFileChange(event: Event) {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        // Émettre un événement pour signaler qu'un fichier a été sélectionné
        this.$emit('file-selected', file);
      }
    }
  }
});
</script>

<style scoped>
  /* Ajoute du style si nécessaire */
</style>
