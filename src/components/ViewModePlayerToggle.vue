<template>
  <div class="inline-flex items-center bg-gray-700 p-1 rounded-full">
    <!-- Bouton "Liste" -->
    <button
      class="
        px-3 py-2
        rounded-l-full
        flex items-center justify-center
        transition-colors
      "
      :class="isListView
        ? 'bg-purple-600 text-white'
        : 'text-gray-200 hover:bg-gray-600'"
      @click="setListView(true)"
    >
      <List class="w-5 h-5" />
    </button>

    <!-- Bouton "Grille" -->
    <button
      class="
        px-3 py-2
        rounded-r-full
        flex items-center justify-center
        transition-colors
      "
      :class="!isListView
        ? 'bg-purple-600 text-white'
        : 'text-gray-200 hover:bg-gray-600'"
      @click="setListView(false)"
    >
      <Grid3x3 class="w-5 h-5" />
    </button>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'ViewModePlayerToggle',
  props: {
    /** Mode d’affichage courant (true => liste, false => grille) */
    isListView: {
      type: Boolean,
      required: true
    }
  },
  emits: ['update:isListView'],
  setup(props, { emit }) {
    function setListView(value: boolean) {
      // On émet le nouvel état
      emit('update:isListView', value);
    }

    return {
      setListView
    };
  }
});
</script>
