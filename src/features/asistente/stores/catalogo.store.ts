import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Ciclo } from '../../landing/types/plans.types'
import { fetchCatalogo } from '../api/catalogo.source'
import type { CatalogoComercial } from '../types/catalogo.types'

/**
 * El catálogo comercial de los 26 artículos.
 *
 * <p>Está en Pinia y no en un `ref()` a nivel de módulo porque lo consumen tres
 * sitios que no se conocen entre sí —el catálogo manual, el comparador de
 * paquete y el panel que orquesta la propuesta— y ese es exactamente el estado
 * compartido que la regla dura manda a un store.
 *
 * ── La caché tiene DOS piezas, y las dos hacen falta ────────────────────────
 * Lista **y promesa en vuelo**, por ciclo. Sin la segunda, tres componentes que
 * montan a la vez disparan tres peticiones idénticas: el `if (ya está cargado)`
 * de los tres se evalúa antes de que ninguna responda. Es el mismo patrón de
 * `legal.store.ts`, con la misma trampa evitada — el `await` en su propia línea,
 * fuera del literal, para que dos cargas en paralelo no capturen el mismo mapa
 * vacío y la segunda escritura borre a la primera.
 *
 * <p>La clave es el **ciclo** porque el precio del ciclo se resuelve en el seam:
 * `MENSUAL` y `ANUAL` son dos catálogos distintos aunque vengan de la misma
 * respuesta, y compartir entrada haría que cambiar de ciclo mostrara los
 * importes del otro.
 */
export const useCatalogoStore = defineStore('asistenteCatalogo', () => {
  const porCiclo = ref<Partial<Record<Ciclo, CatalogoComercial>>>({})
  const loading = ref(false)
  const error = ref<unknown>(null)

  const inFlight = new Map<Ciclo, Promise<void>>()

  function catalogo(ciclo: Ciclo): CatalogoComercial | null {
    return porCiclo.value[ciclo] ?? null
  }

  async function load(ciclo: Ciclo, force = false): Promise<void> {
    if (!force && porCiclo.value[ciclo]) return
    const enCurso = inFlight.get(ciclo)
    if (enCurso) return enCurso

    loading.value = true
    error.value = null
    const promesa = (async () => {
      try {
        const cargado = await fetchCatalogo(ciclo)
        porCiclo.value = { ...porCiclo.value, [ciclo]: cargado }
      } catch (e) {
        // El catálogo NO se borra al fallar una recarga: dejar la pantalla sin
        // precios es peor que mostrar los anteriores, porque la sección entera
        // existe para enseñar cuánto cuesta cada pieza.
        error.value = e
      } finally {
        loading.value = false
        inFlight.delete(ciclo)
      }
    })()
    inFlight.set(ciclo, promesa)
    return promesa
  }

  return { porCiclo, loading, error, catalogo, load }
})
