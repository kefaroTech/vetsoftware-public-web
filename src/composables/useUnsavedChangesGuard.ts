import { onMounted, onUnmounted } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'

/**
 * Avisa antes de perder un formulario a medio llenar.
 *
 * En los 337 componentes del repositorio solo había dos usos de
 * `beforeunload`/`onBeforeRouteLeave`, así que salir de una orden de compra o de
 * una recepción con seis líneas capturadas se llevaba el trabajo sin decir nada.
 *
 * Cubre las dos salidas que el usuario no controla del todo:
 *
 *  - **Cerrar o recargar la pestaña** (`beforeunload`). El navegador ignora el
 *    texto que se le pase y muestra el suyo; lo único que se puede hacer es
 *    pedir la confirmación, y solo si de verdad hay algo que perder — pedirla
 *    siempre es la forma más rápida de que se ignore.
 *  - **Navegar a otra ruta** con el modal abierto, p. ej. pulsando el menú.
 *
 * NO cubre cerrar el propio modal: eso es una acción explícita y con intención,
 * y cada modal decide si la confirma.
 *
 * `isDirty` es una función y no un `computed` para que quien la use pueda
 * incluir el estado de apertura: estos modales viven siempre montados y se
 * controlan con `:open`, así que uno cerrado nunca debe avisar de nada.
 */
export function useUnsavedChangesGuard(
  isDirty: () => boolean,
  message = 'Hay datos sin guardar en este formulario. ¿Salir y perderlos?',
) {
  function warnOnUnload(event: BeforeUnloadEvent) {
    if (!isDirty()) return
    event.preventDefault()
    // Los navegadores modernos no muestran este texto, pero algunos aún exigen
    // que `returnValue` quede asignado para considerar el aviso solicitado.
    event.returnValue = ''
  }

  onMounted(() => {
    if (typeof window !== 'undefined') window.addEventListener('beforeunload', warnOnUnload)
  })

  onUnmounted(() => {
    if (typeof window !== 'undefined') window.removeEventListener('beforeunload', warnOnUnload)
  })

  onBeforeRouteLeave(() => {
    if (!isDirty()) return true
    return window.confirm(message)
  })
}
