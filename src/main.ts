import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'

import * as lucide from 'lucide-vue-next'


const app = createApp(App)


// Pour enregistrer toutes les icônes globalement :
for (const [key, component] of Object.entries(lucide)) {
  app.component(key, component as any)
}

app.mount('#app')
