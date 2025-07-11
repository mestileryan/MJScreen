<template>
  <div class="p-4">
    <div class="flex items-center justify-between mb-10">
      <!-- Titre à gauche -->
      <h2 class="font-bold text-white">Choisissez une icône</h2>

      <!-- Groupement de la barre de recherche et du bouton à droite -->
      <div class="flex items-center gap-2">
        <input type="text"
               ref="searchInput"
               v-model="searchTerm"
               @focus="selectAllSearch"
               class="p-2 rounded bg-gray-700 text-white mr-4"
               placeholder="Rechercher une icône..." />
        <input type="color"
               v-model="selectedColor"
               class="w-8 h-8 p-0 border-0 bg-transparent mr-6" />
        <button class="text-white hover:text-red-400 transition-colors"
                @click="handleClose">
          <CircleX />
        </button>
      </div>
    </div>


    <!-- Container scrollable où se produit l’infinite scroll -->
    <div class="grid grid-cols-6 gap-3 max-h-72 overflow-y-auto"
         ref="scrollContainer">
      <!-- On boucle sur "visibleIcons" => issue de la liste filtrée -->
      <div v-for="icon in visibleIcons"
           :key="icon.path"
           class="flex flex-col items-center cursor-pointer text-gray-400 hover:text-purple-300"
           @click="chooseIcon(icon.name)">
        <svg class="w-8 h-8 text-purple-400"
             :style="{ color: selectedColor }">
          <use :href="`#${icon.name}`" />
        </svg>
        <span class="text-xs text-gray-300">{{ icon.name }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted, watch, nextTick } from 'vue';
  import iconList from '@/assets/icon-list.json';
  const props = defineProps<{ initialSearch?: string, initialColor?: string }>();
  const emit = defineEmits<{
    (e: 'icon-chosen', payload: { iconName: string; color: string }): void;
    (e: 'close'): void;
  }>();

  function handleClose() {
    emit('close');
  }

  interface IconMeta {
    path: string;
    name: string;
  }

  const selectedColor = ref<string>();

  // 1) On scanne tous les fichiers .svg en lazy (sans eager:true)
  //const iconsModules = import.meta.glob('@/assets/game-icons/**/*.svg');

  // 2) On construit un tableau initial complet
  const iconsArray: IconMeta[] = iconList.map((name) => ({
    path: `/src/assets/game-icons/${name}.svg`,
    name
  }));

  /** Barre de recherche */
  const searchTerm = ref('');
  const searchInput = ref<HTMLInputElement | null>(null);
  /** Nombre d’icônes qu’on affiche par “page” */
  const iconsPerPage = 20;
  const currentPage = ref(1);

  /** Filtrer la liste globale en fonction de searchTerm (insensible à la casse) */
  const filteredIcons = computed<IconMeta[]>(() => {
    const term = searchTerm.value.trim().toLowerCase();
    if (!term) {
      return iconsArray;
    }
    return iconsArray.filter((icon) =>
      icon.name.toLowerCase().includes(term)
    );
  });

  /** visibleIcons = la portion visible de la liste filtrée (selon pagination) */
  const visibleIcons = ref<IconMeta[]>([]);

  /** Au changement de `filteredIcons` ou du `searchTerm`, on ré-initialise la pagination */
  function resetPagination() {
    currentPage.value = 1;
    visibleIcons.value = filteredIcons.value.slice(0, iconsPerPage);
    // Recharge si la scrollbox est trop courte
    if (scrollContainer.value && scrollContainer.value.scrollHeight <= scrollContainer.value.clientHeight + 50) {
      loadMoreIcons();
    }
  }

  /** Fonction pour charger la “page suivante” (infinite scroll) */
  function loadMoreIcons() {
    const startIndex = currentPage.value * iconsPerPage;
    const endIndex = startIndex + iconsPerPage;
    const moreIcons = filteredIcons.value.slice(startIndex, endIndex);

    if (moreIcons.length > 0) {
      visibleIcons.value.push(...moreIcons);
      currentPage.value++;
    }
  }

  /** Détecter le scroll */
  const scrollContainer = ref<HTMLElement | null>(null);

  function handleScroll() {
    if (!scrollContainer.value) return;
    const el = scrollContainer.value;
    const scrollBottom = el.scrollHeight - (el.scrollTop + el.clientHeight);

    // Si on est proche du bas, on charge la suite
    if (scrollBottom < 50) {
      loadMoreIcons();
    }
  }

  /** Gérer l'événement "scroll" manuellement */
  onMounted(() => {
    searchTerm.value = props.initialSearch ?? '';
    selectedColor.value = props.initialColor ?? '#c084fc';
    // Initialiser la pagination
    resetPagination();

    // Écouter le scroll
    if (scrollContainer.value) {
      scrollContainer.value.addEventListener('scroll', handleScroll);
    }

    nextTick(() => {
      searchInput.value?.focus();
      searchInput.value?.select();
    });
  });

  /** A chaque changement du champ de recherche, on reset la pagination */
  watch(filteredIcons, () => {
    resetPagination();
  });

  function selectAllSearch() {
    nextTick(() => {
      searchInput.value?.select();
    });
  }

  /** Émission vers le parent quand on choisit une icône */
  function chooseIcon(iconName: string) {
    emit('icon-chosen', { iconName, color: selectedColor.value ?? '#c084fc' });
  }
</script>

<style scoped>
  /* Styles minimaux */
</style>
