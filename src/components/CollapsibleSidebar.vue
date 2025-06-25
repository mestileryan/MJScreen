<template>
  <div :class="[
      'relative border-l border-gray-700',
      collapsed ? 'w-6 flex items-center justify-center' : 'w-96 bg-gray-800 p-6 flex flex-col justify-start'
    ]">
    <button @click="toggle"
            class="absolute -left-3 top-2 rounded-full p-1 text-purple-300 hover:text-purple-400 hover:bg-gray-700 transition-colors bg-gray-800 border border-gray-600 shadow-md">
      <ChevronLeft v-if="collapsed" class="w-4 h-4" />
      <ChevronRight v-else class="w-4 h-4" />
    </button>

    <!-- Bouton en forme de roue crantée -->
    <button @click="openSettings" class="absolute -left-3 top-12 rounded-full p-1 text-purple-300 hover:text-purple-400 hover:bg-gray-700 transition-colors bg-gray-800 border border-gray-600 shadow-md">
      <Settings class="w-4 h-4" />
    </button>

    <slot v-if="!collapsed" />
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
  emits: ['update:collapsed', 'open-settings'],
  components: { ChevronRight, ChevronLeft },
  setup(props, { emit }) {
    function toggle() {
      emit('update:collapsed', !props.collapsed);
    }

    function openSettings() {
      emit('open-settings')
    }

    return { toggle, openSettings };
  }
});
</script>
