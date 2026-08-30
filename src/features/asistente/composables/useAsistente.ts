import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { MAX_REFINAMIENTOS } from '../content/copy.content'
import { usePropuestaStore } from '../stores/propuesta.store'

/**
 * API estable del asistente para los componentes.
 *
 * <p>Wrapper del store con `storeToRefs`, igual que `useSpecies` o
 * `useLegalDocuments`. Ningún componente importa el store; todos importan esto.
 *
 * <p>Lo que añade sobre el store son **derivaciones de presentación**, y ni una
 * sola cifra de dinero: `ajustesRestantes` en frase, la lista de restaurables, y
 * si el bloque de refinamiento se sustituye por la salida humana. Los importes
 * salen del `totales` que devolvió el servidor y este composable no los toca.
 */
export function useAsistente() {
  const store = usePropuestaStore()
  const {
    estado,
    propuesta,
    texto,
    email,
    ciclo,
    sedes,
    usuarios,
    retirados,
    sugerenciasDescartadas,
    delta,
    nuevos,
    guardando,
    traceId,
    lineas,
    codigosEnCarrito,
  } = storeToRefs(store)

  /** Las líneas que propuso el modelo, para el `<h3>` «Lo que te proponemos». */
  const lineasSugeridas = computed(() => lineas.value.filter((l) => l.origen !== 'MANUAL'))
  /** Las que puso el usuario. La subsección no existe si está vacía. */
  const lineasManuales = computed(() => lineas.value.filter((l) => l.origen === 'MANUAL'))

  const ajustesRestantes = computed(() => propuesta.value?.ajustesRestantes ?? MAX_REFINAMIENTOS)
  const sinAjustes = computed(() => ajustesRestantes.value <= 0)

  /**
   * El aviso de cuántos ajustes quedan.
   *
   * <p>`null` **antes del primero**, y es una decisión: un contador de intentos
   * en un campo que aún no se ha usado es ansiedad gratis.
   */
  const avisoAjustes = computed(() => {
    if (ajustesRestantes.value >= MAX_REFINAMIENTOS || sinAjustes.value) return null
    return ajustesRestantes.value === 1
      ? 'Te queda 1 ajuste.'
      : `Te quedan ${ajustesRestantes.value} ajustes.`
  })

  /**
   * El anuncio del delta tras un refinamiento.
   *
   * <p>Va a una región `role="status"` estrecha. `null` cuando no hubo
   * refinamiento: anunciar «0 añadidos, 0 quitados» tras cada clic del catálogo
   * convertiría la región en ruido y el usuario aprendería a ignorarla.
   */
  const anuncioDelta = computed(() => {
    const d = delta.value
    if (!d || (d.anadidos === 0 && d.quitados === 0)) return null
    return `Propuesta actualizada: ${d.anadidos} módulos añadidos, ${d.quitados} quitados.`
  })

  /** Si un código entró en el último recálculo, para el chip «Nuevo». */
  function esNuevo(code: string): boolean {
    return nuevos.value.includes(code)
  }

  return {
    estado,
    propuesta,
    texto,
    email,
    ciclo,
    sedes,
    usuarios,
    retirados,
    sugerenciasDescartadas,
    guardando,
    traceId,
    lineas,
    nuevos,
    lineasSugeridas,
    lineasManuales,
    codigosEnCarrito,
    ajustesRestantes,
    sinAjustes,
    avisoAjustes,
    anuncioDelta,
    esNuevo,
    generar: store.generar,
    reintentar: store.reintentar,
    refinar: store.refinar,
    quitar: store.quitar,
    anadir: store.anadir,
    cambiarAPaquete: store.cambiarAPaquete,
    descartarSugerencia: store.descartarSugerencia,
    cambiarCiclo: store.cambiarCiclo,
    fijarCapacidades: store.fijarCapacidades,
    cancelar: store.cancelar,
    reiniciar: store.reiniciar,
    nuevaLlave: store.nuevaLlave,
  }
}
