import { defineStore } from 'pinia'

/**
 * Tope de rutas recordadas. Sin cota, una sesión larga acumula una entrada por
 * cada `fullPath` visitado —y con filtros en la query string, eso es una entrada
 * por combinación de filtros—. Se descarta la menos usada (LRU).
 */
const MAX_ENTRIES = 30

/**
 * Posición de scroll por ruta, para restaurarla al volver con «atrás».
 *
 * Vive en Pinia porque es estado compartido entre pantallas (la regla del
 * proyecto: nada de singletons `ref()` a nivel de módulo). El `Map` de dentro es
 * deliberadamente NO reactivo: nadie renderiza a partir de él, solo lo leen el
 * `beforeEach` y el `scrollBehavior` del router, y hacerlo reactivo obligaría a
 * Vue a rastrear una escritura por navegación para nada.
 *
 * Existe porque el contenedor de scroll de la app **no es la ventana**: es el
 * `<main class="app-content">` de `AppLayout.vue`, un div con `overflow: auto`
 * dentro de un shell con `overflow: hidden`. El navegador no restaura el scroll
 * de un div, así que `savedPosition` de `vue-router` siempre llega a 0 y hay que
 * llevar la cuenta a mano.
 */
export const useScrollMemoryStore = defineStore('scrollMemory', () => {
  const positions = new Map<string, number>()

  function remember(fullPath: string, top: number): void {
    // Reinsertar mantiene el orden de uso: `Map` itera por orden de inserción,
    // así que la primera clave es siempre la más antigua sin tocar.
    positions.delete(fullPath)
    positions.set(fullPath, top)
    if (positions.size > MAX_ENTRIES) {
      const oldest = positions.keys().next()
      if (!oldest.done) positions.delete(oldest.value)
    }
  }

  /** 0 cuando no hay nada recordado: volver arriba es el comportamiento correcto. */
  function recall(fullPath: string): number {
    const top = positions.get(fullPath) ?? 0
    if (top > 0) remember(fullPath, top) // refresca su posición en el LRU
    return top
  }

  function forget(): void {
    positions.clear()
  }

  return { remember, recall, forget }
})
