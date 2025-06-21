import { ref } from 'vue';

export const backendUrl = ref<string>(localStorage.getItem('backendUrl') || '');

export function setBackendUrl(url: string) {
  backendUrl.value = url;
  if (url) localStorage.setItem('backendUrl', url);
  else localStorage.removeItem('backendUrl');
}
