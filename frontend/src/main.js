import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'

import './style.css'
import App from './App.vue'

// Sayfa render edilmeden önce kayıtlı temayı uygula — böylece login gibi
// AppHeader'sız sayfalarda da ve ilk yüklemede light mode flaşı yaşanmaz.
if (localStorage.getItem('theme') === 'dark') {
  document.documentElement.classList.add('dark')
  document.documentElement.setAttribute('data-theme', 'dark')
}

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

app.mount('#app')
