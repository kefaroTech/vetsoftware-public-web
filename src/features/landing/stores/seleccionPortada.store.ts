import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * Lo que el visitante dejó marcado en la portada, de camino a `/planes`.
 *
 * ── Por qué no viaja dentro de la intención de contratación ─────────────────
 * `useContratacion.elegir()` sabe guardar módulos, pero escribir ahí desde el
 * hero tendría dos efectos que nadie pidió: pisaría una intención de PROPUESTA
 * —la entrada más cara del embudo— y convertiría una elección de paquete en una
 * modular sin `planCode`, con lo que la banda de «sigue donde lo dejaste»
 * dejaría de aparecer. Pulsar «Ver propuesta» todavía no es elegir nada: es
 * pasar de pantalla.
 *
 * ── Por qué no se persiste ─────────────────────────────────────────────────
 * Es una entrega entre dos pantallas de la misma navegación. Sobrevivir al
 * cierre del navegador la convertiría en una semilla vieja que le ganaría al
 * paquete recomendado semanas después, sin que el visitante recuerde haber
 * marcado nada.
 */
export const useSeleccionPortadaStore = defineStore('seleccionPortada', () => {
  /** `null` es «no se viene de la portada». Una lista vacía SÍ es una selección. */
  const modulos = ref<readonly string[] | null>(null)

  function entregar(codigos: readonly string[]) {
    modulos.value = [...codigos]
  }

  /**
   * Se consume al recogerla: vale para la pantalla que viene detrás del clic, no
   * para la siguiente visita a `/planes`, que ya no llega desde la portada.
   */
  function recoger(): readonly string[] | null {
    const codigos = modulos.value
    modulos.value = null
    return codigos
  }

  return { modulos, entregar, recoger }
})
