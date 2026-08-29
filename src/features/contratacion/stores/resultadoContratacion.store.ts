import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ResultadoContratacion } from '../types/contratacion.types'

/**
 * Lo que la pantalla de éxito necesita saber sobre lo que acaba de pasar.
 *
 * Vive en un store de Pinia porque lo escribe una pantalla y lo lee otra, y eso
 * es estado compartido: un `ref()` a nivel de módulo dentro de un composable
 * está prohibido en este repo, y con razón —en dos pestañas compartiría el
 * resultado de una contratación con la otra—.
 *
 * **No se persiste.** Es el resultado de una acción, no un borrador: si el
 * usuario recarga `/dashboard/contratar/exito` una semana después, lo correcto
 * es que la pantalla no tenga nada que contar y lo mande al tablero, no que le
 * repita una activación vieja como si acabara de ocurrir.
 */
export const useResultadoContratacionStore = defineStore('contratacionResultado', () => {
  const resultado = ref<ResultadoContratacion | null>(null)

  function guardar(r: ResultadoContratacion) {
    resultado.value = r
  }

  function limpiar() {
    resultado.value = null
  }

  return { resultado, guardar, limpiar }
})
