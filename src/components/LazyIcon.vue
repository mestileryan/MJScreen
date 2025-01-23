<template>
  <div v-if="iconComponent">
    <component :is="iconComponent" />
  </div>
  <div v-else>
    <!-- Par exemple, un petit spinner ou un texte -->
    <span class="text-sm">Chargement...</span>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

interface IconMeta {
  path: string;
  name: string;
  loader: () => Promise<any>;
  component: any | null; // sera éventuellement rempli
}

// On reçoit "icon" en props
const props = defineProps<{
  icon: IconMeta;
}>();

// État local : composant réellement chargé
const iconComponent = ref<any>(null);

onMounted(async () => {
  // Si l’icône n’est pas déjà chargée, on l’importe
  if (!props.icon.component) {
    const mod = await props.icon.loader();
    props.icon.component = mod.default;
  }
  // On affecte localement
  iconComponent.value = props.icon.component;
});
</script>

<style scoped></style>
