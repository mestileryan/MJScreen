<template>
  <div class="w-full bg-gray-800 rounded-lg p-4">
    <h2 class="text-xl font-semibold text-white mb-4">Bibliothèque</h2>

    <div class="space-y-2" v-if="trackFiles.length">
      <ul>
        <!-- On délègue chaque piste à LibraryTrack -->
        <LibraryTrack v-for="(trackFile, index) in trackFiles"
                     :key="index"
                     :trackFile="trackFile"
                     :index="index"
                     @remove-file="removeFile"
                     @play="playTrack" />
      </ul>
    </div>

    <div v-else>
      <p class="text-gray-400 italic">Aucun fichier pour le moment.</p>
    </div>
  </div>
</template>

<script lang="ts">
  import { defineComponent, ref, onMounted } from 'vue';
  import FileTrack from '@/models/FileTrack';
  import {
    DB_AddTrack,
    DB_RemoveTrack,
    DB_GetTracks
  } from '@/persistance/TrackService';
  import LibraryTrack from './LibraryTrack.vue';

  export default defineComponent({
    name: 'Library',
    components: {
      LibraryTrack
    },
    setup(props, { emit }) {
      const trackFiles = ref<FileTrack[]>([]);

      onMounted(async () => {
        // Charger depuis la DB
        const loadedTracks = await DB_GetTracks();
        trackFiles.value = loadedTracks;
      });

      // Ajouter un fichier
      function addFile(newFile: File) {
        const ft = new FileTrack(newFile, newFile.name);
        ft.id = DB_AddTrack(ft);
        trackFiles.value.push(ft);
      }

      // Ajouter plusieurs fichiers
      function addFiles(newFiles: File | File[]) {
        if (!Array.isArray(newFiles)) {
          newFiles = [newFiles];
        }
        newFiles.forEach((file) => {
          const ft = new FileTrack(file, file.name);
          ft.id = DB_AddTrack(ft);
          trackFiles.value.push(ft);
        });
      }

      // Supprimer (quand LibraryTrack émet 'remove-file')
      function removeFile(index: number) {
        const track = trackFiles.value[index];
        // Retirer de la liste
        trackFiles.value.splice(index, 1);
        // Retirer côté DB
        DB_RemoveTrack(track);
      }

      // Jouer (quand LibraryTrack émet 'play')
      function playTrack(index: number) {
        const track = trackFiles.value[index];
        if (!track) return;
        emit('play', track);
      }

      return {
        trackFiles,
        addFile,
        addFiles,
        removeFile,
        playTrack
      };
    }
  });
</script>
