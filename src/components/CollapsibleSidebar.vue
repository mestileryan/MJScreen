<template>
  <div v-if="!collapsed" class="w-96 bg-gray-800 p-6 flex flex-col justify-start border-l border-gray-700 relative">
    <button @click="toggle" class="absolute -left-3 top-2 rounded-full p-1 text-purple-300 hover:text-purple-400 hover:bg-gray-700 transition-colors bg-gray-800 border border-gray-600 shadow-md">
      <ChevronRight class="w-4 h-4" />
    </button>
    <slot />
    <slot name="footer" />
  </div>
  <div v-else class="relative w-6 flex items-center justify-center border-l border-gray-700">
    <button @click="toggle" class="absolute -left-3 top-2 rounded-full p-1 text-purple-300 hover:text-purple-400 hover:bg-gray-700 transition-colors bg-gray-800 border border-gray-600 shadow-md">
      <ChevronLeft class="w-4 h-4" />
    </button>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { ChevronRight, ChevronLeft } from 'lucide-vue-next';

export default defineComponent({
  name: 'CollapsibleSidebar',
  props: {
    collapsed: { type: Boolean, required: true }
  },
  emits: ['update:collapsed'],
  components: { ChevronRight, ChevronLeft },
  setup(props, { emit }) {
    function toggle() {
      emit('update:collapsed', !props.collapsed);
    }

    return { toggle };
  }
});
</script>
