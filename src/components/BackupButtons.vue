<template>
  <div>
    <!-- Bouton pour exporter les deux bases dans un seul fichier -->
    <button @click="exportEverything">Exporter toutes les DB</button>

    <!-- Champ de sélection pour importer le fichier global -->
    <div>
      <label for="importFile">Importer toutes les DB :</label>
      <input type="file" id="importFile" @change="importEverything" accept="application/json" />
    </div>
  </div>
</template>

<script lang="ts">
  import { DB_ExportTracks, DB_ImportTracks, DB_ClearTracks } from '@/persistance/TrackService';
  import { DB_ExportPlaylists, DB_ImportPlaylists, DB_ClearPlaylists } from '@/persistance/PlaylistService';

export default {
  name: 'BackupButtons',
  methods: {
    async exportEverything() {
      try {
        // Export de chaque base via dexie-export-import
        const trackBlob = await DB_ExportTracks();
        const playlistBlob = await DB_ExportPlaylists();

        // Convertir les blobs en texte JSON
        const playlistText = await playlistBlob.text();
        const trackText = await trackBlob.text();

        // Combiner les contenus JSON dans un objet global
        const exportData = {
          playlistLibrary: JSON.parse(playlistText),
          trackLibrary: JSON.parse(trackText)
        };

        // Créer un Blob à partir de l'objet combiné
        const combinedBlob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });

        // Créer une URL de téléchargement et simuler un clic sur un lien
        const url = URL.createObjectURL(combinedBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Backup.json';
        a.click();

      } catch (error) {
        console.error("Erreur lors de l'export global :", error);
      }
    },
    async importEverything(event: Event) {
      const input = event.target as HTMLInputElement;
      const file = input.files ? input.files[0] : null;
      if (!file) return;

      try {
        // Lire le contenu du fichier
        const text = await file.text();
        const data = JSON.parse(text);

        // Import pour PlaylistLibraryDB
        if (data.playlistLibrary) {
          // Optionnel : vider l'ancien contenu pour éviter des doublons
          DB_ClearPlaylists();
          // Recréer un Blob à partir des données exportées
          const blobPlaylist = new Blob([JSON.stringify(data.playlistLibrary)], { type: 'application/json' });
          DB_ImportPlaylists(blobPlaylist);
        }

        // Import pour TrackLibraryDB
        if (data.trackLibrary) {
          DB_ClearTracks();
          const blobTrack = new Blob([JSON.stringify(data.trackLibrary)], { type: 'application/json' });
          DB_ImportTracks(blobTrack);
        }

        console.log("Import global terminé");

      } catch (error) {
        console.error("Erreur lors de l'import global :", error);
      }
    }
  }
}
</script>
