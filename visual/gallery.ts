/**
 * Punto de entrada de la galería visual.
 *
 * Es una entrada de Vite SEPARADA de `index.html`, así que no entra en el
 * bundle de producción: `vite build` sigue compilando solo la aplicación. Vive
 * aquí para poder importar los componentes REALES y las hojas REALES —si se
 * pintara con CSS copiado, la regresión no protegería nada.
 *
 * No monta router ni Pinia a propósito: todo lo que la galería muestra recibe
 * sus datos por props, y esa restricción es lo que la mantiene determinista.
 */
import { createApp } from 'vue'
import '../src/assets/styles/tokens.css'
import '../src/assets/styles/base.css'
import '../src/assets/styles/primitives.css'
import '../src/assets/styles/app.css'
// La hoja de la ZONA PÚBLICA. Entra porque la reparación de accesibilidad de
// nivel A y el flujo comercial viven ahí, y hasta ahora ninguna captura la
// cargaba: `--pub-ok-tx` y el color de `.pub-error` cambiaron de token sin que
// ningún gate visual pudiera verlo. No arrastra nada al resto de la galería —
// sus variables se declaran bajo `.pub-scope`, no en `:root`, y todos sus
// selectores son de clase `.pub-*`.
import '../src/assets/styles/public-auth.css'
import Gallery from './Gallery.vue'

createApp(Gallery).mount('#app')
