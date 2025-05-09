<template>
  <div class="min-h-screen bg-gray-900 p-4">
    <h1 class="text-3xl font-bold text-purple-400 mb-8">MJ Screen Jukebox</h1>

    <grid-layout
      v-model:layout="layout"
      :col-num="12"
      :row-height="30"
      :is-draggable="true"
      :is-resizable="true"
      :vertical-compact="true"
      :margin="[10, 10]"
      :use-css-transforms="true"
    >
      <grid-item v-for="item in layout"
                 :key="item.i"
                 :x="item.x"
                 :y="item.y"
                 :w="item.w"
                 :h="item.h"
                 :i="item.i"
                 :min-w="4"
                 :min-h="3">
        <div class="h-full">
          <Library v-if="item.i === 'library'" ref="library" @play="handlePlay" class="h-full" />
          <TracksPlayer v-if="item.i === 'player'" ref="tracksPlayer" class="h-full" />
        </div>
      </grid-item>
    </grid-layout>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { GridLayout, GridItem } from 'vue-grid-layout';
import Library from './Library.vue';
import TracksPlayer from './TracksPlayer.vue';
import FileTrack from '../models/FileTrack';

export default defineComponent({
  name: 'Screen',
  components: {
    Library,
    TracksPlayer,
    GridLayout,
    GridItem
  },
  setup() {
    const library = ref<InstanceType<typeof Library> | null>(null);
    const tracksPlayer = ref<InstanceType<typeof TracksPlayer> | null>(null);

    const layout = ref([
      { x: 0, y: 0, w: 8, h: 20, i: 'library' },
      { x: 8, y: 0, w: 4, h: 20, i: 'player' }
    ]);

    const handlePlay = (track: FileTrack) => {
      if (tracksPlayer.value) {
        tracksPlayer.value.addTrack(track.file, track.name, track.initialVolume);
      }
    };

    return {
      library,
      tracksPlayer,
      handlePlay,
      layout
    };
  },
});
</script>

<style>
.vue-grid-item {
  background: #1f2937;
  border-radius: 0.5rem;
}

.vue-grid-item.vue-grid-placeholder {
  background: #2563eb !important;
  opacity: 0.2;
  transition-duration: 100ms;
  z-index: 2;
  user-select: none;
}

.vue-grid-item > .vue-resizable-handle {
  background: url('data:image/svg+xml;utf8,<svg width="10" height="10" viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg"><path d="M0 10L10 0L10 10z" fill="rgba(255,255,255,0.3)"/></svg>') no-repeat;
  background-position: bottom right;
  padding: 0 3px 3px 0;
  background-origin: content-box;
  box-sizing: border-box;
  cursor: se-resize;
  bottom: 0;
  right: 0;
  width: 20px;
  height: 20px;
  position: absolute;
}
</style>