<template>
  <div class="w-full bg-gray-800 rounded-lg p-4 mt-4">
    <h2 class="text-xl font-bold text-purple-300 mb-2">Notes</h2>
    <div ref="editor" class="bg-white text-black rounded p-2 min-h-[150px]"></div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import 'quill-mention/dist/quill.mention.css';
import 'quill-mention/autoregister';
import { DB_GetTracks } from '@/persistance/TrackService';
import type FileTrack from '@/models/FileTrack';

const emit = defineEmits<{ (e: 'play', track: FileTrack): void }>();
const editor = ref<HTMLDivElement | null>(null);
let quill: Quill;
const tracks = ref<FileTrack[]>([]);
const trackMap = new Map<string, FileTrack>();

function convertHashesToLinks() {
  const text = quill.getText();
  const regex = /#([\w.-]+)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text))) {
    const index = match.index;
    const length = match[0].length;
    const name = match[1];
    if (trackMap.has(name)) {
      const delta = quill.getContents(index, length);
      const hasLink = delta.ops?.some(op => typeof op.insert === 'string' && op.attributes && op.attributes.link);
      if (!hasLink) {
        quill.formatText(index, length, 'link', `track:${name}`);
      }
    }
  }
}

onMounted(async () => {
  tracks.value = await DB_GetTracks();
  tracks.value.forEach(t => trackMap.set(t.name, t));

  quill = new Quill(editor.value as HTMLElement, {
    theme: 'snow',
    modules: {
      toolbar: [['bold', 'italic', 'underline', 'strike'], [{ list: 'ordered' }, { list: 'bullet' }], ['clean']],
      mention: {
        mentionDenotationChars: ['#'],
        allowedChars: /^[A-Za-z0-9_ .-]*$/,
        source: (searchTerm: string, renderList: (values: {id: string, value: string}[], searchTerm: string) => void) => {
          const values = tracks.value.map(t => ({ id: t.name, value: t.name }));
          if (!searchTerm) {
            renderList(values, searchTerm);
          } else {
            const matches = values.filter(v => v.value.toLowerCase().includes(searchTerm.toLowerCase()));
            renderList(matches, searchTerm);
          }
        },
        onSelect: (item: DOMStringMap, insertItem: (data: Record<string, unknown>) => void) => {
          insertItem(item);
          const range = quill.getSelection(true);
          if (range) {
            quill.formatText(range.index - item.value.length - 1, item.value.length + 1, 'link', `track:${item.value}`);
          }
        },
      },
    },
  });

  editor.value!.addEventListener('click', e => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'A' && target.getAttribute('href')?.startsWith('track:')) {
      e.preventDefault();
      const name = target.getAttribute('href')!.slice('track:'.length);
      const track = trackMap.get(name);
      if (track) emit('play', track);
    }
  });

  editor.value!.addEventListener('paste', () => {
    setTimeout(convertHashesToLinks, 0);
  });

  quill.on('text-change', (delta, old, source) => {
    if (source === 'user') convertHashesToLinks();
  });
});
</script>
