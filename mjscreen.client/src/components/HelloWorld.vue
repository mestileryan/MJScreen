<!-- HelloWorld.vue -->
<template>
  <Uploader @file-selected="handleFileSelected" />
  <AudioPlayer :src="audioUrl" />
</template>

<script lang="ts">
  import { defineComponent, ref } from 'vue';
  import Uploader from './Uploader.vue';
  import AudioPlayer from './Track.vue';

  export default defineComponent({
    name: 'HelloWorld',
    components: {
      Uploader,
      AudioPlayer,
    },
    setup() {
      const audioUrl = ref<string | null>(null);

      const handleFileSelected = (file: File) => {
        if (audioUrl.value) {
          URL.revokeObjectURL(audioUrl.value);
        }
        audioUrl.value = URL.createObjectURL(file);
      };

      return {
        audioUrl,
        handleFileSelected,
      };
    },
  });
</script>

<style scoped>
  /* Styles optionnels */
</style>
