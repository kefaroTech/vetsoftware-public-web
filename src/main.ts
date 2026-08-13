import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { startTelemetry } from './services/telemetry/telemetry'
import vuetify from './plugins/vuetify'
import './assets/styles/tokens.css'
import './assets/styles/primitives.css'
import './assets/styles/main.css'
import './assets/styles/public-auth.css'

createApp(App).use(createPinia()).use(router).use(vuetify).mount('#app')

// TR-05: despues de montar y en un chunk aparte, para no entrar en la ruta critica que mide
// el presupuesto de bundle. Si no hay colector configurado, no descarga nada.
void startTelemetry()
