import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { startTelemetry } from './services/telemetry/telemetry'
import { registerVolatileStorageKeys } from './constants/storageKeys'
import vuetify from './plugins/vuetify'
import './assets/styles/tokens.css'
import './assets/styles/primitives.css'
import './assets/styles/main.css'
import './assets/styles/public-auth.css'

// Antes de montar: el registro de claves volatiles vive en memoria del modulo de
// storageService, y `clearVolatile()` puede dispararlo un 401 en la primera peticion
// que haga la aplicacion. Si se registrara mas tarde, ese cierre de sesion dejaria
// atras el borrador clinico y la sede activa (issue #68).
registerVolatileStorageKeys()

createApp(App).use(createPinia()).use(router).use(vuetify).mount('#app')

// TR-05: despues de montar y en un chunk aparte, para no entrar en la ruta critica que mide
// el presupuesto de bundle. Si no hay colector configurado, no descarga nada.
void startTelemetry()
