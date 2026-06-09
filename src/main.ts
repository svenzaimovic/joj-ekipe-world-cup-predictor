import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/main.css'

const app = createApp(App)

// Surface unhandled errors visibly in production so we're not debugging blind
app.config.errorHandler = (err, _instance, info) => {
  console.error('[vue] unhandled error:', err, info)
}

app.use(createPinia())
app.use(router)
app.mount('#app')
