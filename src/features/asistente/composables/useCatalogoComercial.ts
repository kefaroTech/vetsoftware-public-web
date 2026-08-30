import { storeToRefs } from 'pinia'
import { computed, onMounted, watch, type Ref } from 'vue'
import { GRUPOS, ORDEN_GRUPOS } from '../content/catalogo.content'
import { useCatalogoStore } from '../stores/catalogo.store'
import type { ArticuloCatalogo, CatalogoComercial, GrupoCatalogo } from '../types/catalogo.types'
import type { Ciclo } from '../../landing/types/plans.types'

/** Un grupo con sus artículos, listo para un `<fieldset><legend>`. */
export interface GrupoConArticulos {
  clave: GrupoCatalogo
  titulo: string
  articulos: ArticuloCatalogo[]
}

/**
 * API estable del catálogo comercial para los componentes.
 *
 * <p>Wrapper del store con `storeToRefs`, en la línea de `usePlanes` y
 * `useLegalDocuments`: los componentes no conocen el store, solo esto. Y
 * **recarga al montar**, que es la regla del repositorio para toda pantalla o
 * modal que se abre — un precio de una visita anterior es un precio que puede
 * haber cambiado.
 *
 * @param ciclo
 *            reactivo, porque el importe se resuelve por ciclo en el seam.
 *            Cambiarlo recarga: no se deriva el anual del mensual en ningún
 *            sitio de este front.
 */
export function useCatalogoComercial(ciclo: Ref<Ciclo>) {
  const store = useCatalogoStore()
  const { loading, error } = storeToRefs(store)

  onMounted(() => void store.load(ciclo.value, true))
  watch(ciclo, (nuevo) => void store.load(nuevo))

  const catalogo = computed<CatalogoComercial | null>(() => store.catalogo(ciclo.value))

  const articulos = computed<ArticuloCatalogo[]>(() => catalogo.value?.articulos ?? [])

  /**
   * Los cuatro grupos, **en orden explícito**.
   *
   * <p>El orden sale de `ORDEN_GRUPOS` y no de las claves del mapa: el orden de
   * claves de un objeto no es una promesa del lenguaje en la que se pueda apoyar
   * el orden visual de un formulario (§2.4.3), y aquí además es el orden en que
   * el prospecto se hace las preguntas.
   */
  const grupos = computed<GrupoConArticulos[]>(() =>
    ORDEN_GRUPOS.map((clave) => ({
      clave,
      titulo: GRUPOS[clave],
      // Solo lo vendible a mano. `CORE` es `is_core` y entra siempre, las
      // capacidades se muestran como dato y los ONE_TIME se cotizan aparte:
      // ninguno de los tres es una casilla, y ninguno tiene grupo asignado.
      articulos: articulos.value.filter((a) => a.grupo === clave && a.vendible),
    })).filter((g) => g.articulos.length > 0),
  )

  function articulo(code: string): ArticuloCatalogo | null {
    return articulos.value.find((a) => a.code === code) ?? null
  }

  /** El nombre comercial, o el propio código si el catálogo aún no llegó. */
  function nombreDe(code: string): string {
    return articulo(code)?.nombre ?? code
  }

  return {
    catalogo,
    articulos,
    grupos,
    loading,
    error,
    articulo,
    nombreDe,
    refresh: () => store.load(ciclo.value, true),
  }
}
