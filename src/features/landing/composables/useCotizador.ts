import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useCancellableLatest } from '@/composables/useLatestOnly'
import { arrastraAlMarcar, caeAlQuitar } from '@/features/asistente/composables/dependencias'
import { useCatalogoComercial } from '@/features/asistente/composables/useCatalogoComercial'
import type { PaqueteCatalogo } from '@/features/asistente/types/catalogo.types'
import {
  esLimiteDeCotizaciones,
  previsualizarCotizacion,
  segundosDeEspera,
} from '../api/cotizacion.source'
import type { CotizacionPreview } from '../types/cotizacion.types'
import type { Ciclo } from '../types/plans.types'
import { cestaDeCotizacion, modulosDelPaquete, paqueteQueCoincide } from './cotizadorLineas'
import { importeEstimado, sufijoCiclo } from './planPricing'

/**
 * El cotizador de la portada: la selección, y el importe que el servidor le pone.
 *
 * <p>Estado de vista, no de aplicación: vive con la pantalla y muere con ella,
 * así que **no hay nada nuevo en Pinia**. Lo único compartido es el catálogo, que
 * ya tiene su store.
 */

/**
 * Silencio necesario antes de pedir. Coalesce la ráfaga de clics —tres casillas
 * seguidas producen UNA petición y UN anuncio— y acota el gasto del límite por IP
 * sin montar una cola propia.
 */
const PREVIEW_DEBOUNCE_MS = 500

/**
 * Umbral por encima del cual se admite decir «calculando». Por debajo de un
 * segundo la respuesta se percibe como instantánea y el indicador solo parpadea.
 */
const CALCULANDO_MS = 1000

/**
 * Suelo entre dos anuncios consecutivos. **No es un retardo del anuncio**: la
 * coalescencia ya la hace el debounce, antes del viaje, y sumar un retardo
 * después de la respuesta empujaría el total por encima del segundo. Lo que sí
 * hace falta es esta distancia mínima, porque dos respuestas separadas por 80 ms
 * se pisan en el lector.
 */
const ANUNCIO_MS = 400

/**
 * Cuánto se espera tras un 429 cuando `Retry-After` no llega. El cupo es por
 * minuto, así que esperar la ventana entera nunca es optimista: un plazo más
 * corto invita a un reintento que va a fallar y que además alarga el bloqueo.
 */
const ESPERA_LIMITE_MS = 60_000

/**
 * Los cuatro estados del importe.
 *
 * <p>`CALCULANDO` es también el arranque: el catálogo llega después del primer
 * render y afirmar una cifra antes de que vuelva la respuesta es afirmar un
 * precio que nadie publicó. `SIN_CATALOGO` es el otro extremo —no hay tarifa
 * vigente o no llegó— y ahí no hay cifra ninguna, ni vieja ni nueva.
 */
export type EstadoImporte = 'CALCULANDO' | 'LISTO' | 'ERROR' | 'SIN_CATALOGO'

const FALLO_GENERICO =
  'No pudimos calcular el precio ahora mismo. Puedes seguir: el precio exacto lo ves antes de confirmar.'

const FALLO_LIMITE =
  'Estamos recibiendo muchas consultas y el precio no se puede calcular durante un minuto. Puedes seguir: el precio exacto lo ves antes de confirmar.'

/** Lo que hace falta para explicar por qué subió el precio, y para deshacerlo. */
export interface SaltoDePaquete {
  paquete: PaqueteCatalogo
  texto: string
}

export function useCotizador() {
  const ciclo = ref<Ciclo>('MENSUAL')
  const modulos = ref<string[]>([])
  const sedes = ref(1)
  const usuarios = ref(1)

  const { catalogo, loading, error: errorCatalogo } = useCatalogoComercial(ciclo)
  const preview = useCancellableLatest()

  const cotizacion = ref<CotizacionPreview | null>(null)
  const estado = ref<EstadoImporte>('CALCULANDO')
  /** Pasado `CALCULANDO_MS` sin respuesta. Solo entonces se admite decirlo. */
  const lento = ref(false)
  const limitado = ref(false)
  const saltoDePaquete = ref<SaltoDePaquete | null>(null)
  /** La única región viva de la pantalla. Se vacía en cuanto arranca un recálculo. */
  const regionViva = ref('')

  let temporizadorPeticion: ReturnType<typeof setTimeout> | null = null
  let temporizadorLento: ReturnType<typeof setTimeout> | null = null
  let temporizadorAnuncio: ReturnType<typeof setTimeout> | null = null
  let temporizadorLimite: ReturnType<typeof setTimeout> | null = null
  let ultimoAnuncioEn = 0
  let anuncioDeLentitudHecho = false
  /** Cómo se resolvió la cotización anterior, que es contra lo que se compara el salto. */
  let anterior: { paquete: PaqueteCatalogo | null; subtotal: number } | null = null

  const hayCatalogo = computed(() => (catalogo.value?.articulos.length ?? 0) > 0)

  /**
   * No hay nada que cotizar, y consta: el catálogo LLEGÓ vacío —no hay tarifa
   * vigente— o no se pudo cargar. Con la petición en vuelo la lista también está
   * vacía, y afirmar entonces que no hay precios es una mentira de medio segundo.
   */
  const sinCatalogo = computed(
    () => !hayCatalogo.value && (catalogo.value !== null || errorCatalogo.value !== null),
  )

  const cesta = computed(() =>
    catalogo.value
      ? cestaDeCotizacion(
          { modulos: modulos.value, sedes: sedes.value, usuarios: usuarios.value },
          catalogo.value,
        )
      : null,
  )

  /** El paquete que la selección reproduce ahora mismo, si lo hay. */
  const paquete = computed(() =>
    catalogo.value ? paqueteQueCoincide(modulos.value, catalogo.value) : null,
  )

  /**
   * Lo que identifica una cotización. Dos selecciones distintas que producen la
   * misma cesta —plegar un área, marcar y desmarcar— no vuelven a pedir.
   */
  const clave = computed(() =>
    cesta.value ? `${ciclo.value}|${JSON.stringify(cesta.value.lineas)}` : '',
  )

  /** La cifra que se PINTA. Nunca `$ 0`: el guion es el marcador de «sin dato». */
  const importe = computed(() =>
    cotizacion.value ? importeEstimado(cotizacion.value.subtotal) : '—',
  )

  const mensajeDeFallo = computed(() => {
    if (limitado.value) return FALLO_LIMITE
    return estado.value === 'ERROR' ? FALLO_GENERICO : null
  })

  function nombreParaLector(): string {
    const n = modulos.value.length
    if (n === 0) return 'Solo el núcleo'
    return n === 1 ? 'Núcleo y 1 módulo' : `Núcleo y ${n} módulos`
  }

  function anunciar(texto: string) {
    if (temporizadorAnuncio) clearTimeout(temporizadorAnuncio)
    const espera = Math.max(0, ANUNCIO_MS - (Date.now() - ultimoAnuncioEn))
    if (espera === 0) {
      regionViva.value = texto
      ultimoAnuncioEn = Date.now()
      return
    }
    temporizadorAnuncio = setTimeout(() => {
      regionViva.value = texto
      ultimoAnuncioEn = Date.now()
    }, espera)
  }

  function limpiarTemporizadores() {
    for (const t of [temporizadorPeticion, temporizadorLento, temporizadorAnuncio]) {
      if (t) clearTimeout(t)
    }
    temporizadorPeticion = null
    temporizadorLento = null
    temporizadorAnuncio = null
  }

  function explicarSalto(nuevo: CotizacionPreview, paqueteAhora: PaqueteCatalogo | null) {
    const cat = catalogo.value
    if (paqueteAhora) {
      saltoDePaquete.value = null
      return
    }
    const previo = anterior
    if (!cat || !previo?.paquete || nuevo.subtotal <= previo.subtotal) return

    const n = modulos.value.length
    const sueltos =
      n === 1
        ? `el que te queda cuesta ${importeEstimado(nuevo.subtotal)}`
        : `los ${n} que te quedan suman ${importeEstimado(nuevo.subtotal)}`
    saltoDePaquete.value = {
      paquete: previo.paquete,
      texto:
        `Los ${modulosDelPaquete(previo.paquete, cat).length} módulos de ` +
        `${previo.paquete.nombre} juntos costaban ${importeEstimado(previo.subtotal)}. ` +
        `Sueltos, ${sueltos}. Los paquetes tienen descuento; los módulos sueltos, no.`,
    }
  }

  function bloquearPorLimite(error: unknown) {
    limitado.value = true
    if (temporizadorLimite) clearTimeout(temporizadorLimite)
    const segundos = segundosDeEspera(error)
    temporizadorLimite = setTimeout(
      () => {
        limitado.value = false
        temporizadorLimite = null
        programar()
      },
      segundos !== null ? segundos * 1000 : ESPERA_LIMITE_MS,
    )
  }

  async function pedir() {
    const actual = cesta.value
    if (!actual) return

    const turno = preview.begin()
    try {
      const respuesta = await previsualizarCotizacion(
        { ciclo: ciclo.value, lineas: actual.lineas },
        turno.signal,
      )
      if (!turno.isCurrent()) return
      if (temporizadorLento) clearTimeout(temporizadorLento)
      lento.value = false
      anuncioDeLentitudHecho = false

      explicarSalto(respuesta, actual.paquete)
      cotizacion.value = respuesta
      estado.value = 'LISTO'
      anterior = { paquete: actual.paquete, subtotal: respuesta.subtotal }

      const salto = saltoDePaquete.value
      anunciar(
        `${nombreParaLector()}. Desde ${importeEstimado(respuesta.subtotal)} más IVA ` +
          `${sufijoCiclo(ciclo.value)}.` +
          (salto
            ? ` Subió el precio porque se perdió el descuento de la combinación ${salto.paquete.nombre}.`
            : ''),
      )
    } catch (error) {
      if (!turno.isCurrent()) return
      if (temporizadorLento) clearTimeout(temporizadorLento)
      lento.value = false
      anuncioDeLentitudHecho = false

      // La cifra anterior se DESTRUYE: dejarla en pantalla junto a un aviso la
      // convierte en la respuesta a una pregunta que no se llegó a hacer.
      cotizacion.value = null
      anterior = null
      estado.value = 'ERROR'
      if (esLimiteDeCotizaciones(error)) bloquearPorLimite(error)
      anunciar(limitado.value ? FALLO_LIMITE : FALLO_GENERICO)
    }
  }

  function programar() {
    limpiarTemporizadores()

    if (!hayCatalogo.value) {
      estado.value = sinCatalogo.value ? 'SIN_CATALOGO' : 'CALCULANDO'
      cotizacion.value = null
      return
    }
    if (limitado.value) return

    estado.value = 'CALCULANDO'
    regionViva.value = ''
    temporizadorPeticion = setTimeout(() => void pedir(), PREVIEW_DEBOUNCE_MS)
    temporizadorLento = setTimeout(() => {
      lento.value = true
      if (anuncioDeLentitudHecho) return
      anuncioDeLentitudHecho = true
      anunciar('Calculando el precio.')
    }, CALCULANDO_MS)
  }

  watch([clave, hayCatalogo, sinCatalogo], programar, { immediate: true })

  /**
   * Marca o desmarca un módulo **con su cadena de requisitos**.
   *
   * <p>Marcar arrastra lo que el módulo necesita y desmarcar se lleva lo que
   * dependía de él: una cesta que no cierra sus `REQUIRES` la rechaza el servidor
   * con un cuerpo que no dice qué faltaba. Devuelve lo que cambió además de lo
   * pedido, para que la pantalla lo pueda explicar.
   */
  function alternarModulo(code: string, marcado: boolean): string[] {
    const cat = catalogo.value
    if (!cat) return []

    if (marcado) {
      const arrastrados = arrastraAlMarcar(code, modulos.value, cat)
      modulos.value = [...modulos.value, code, ...arrastrados]
      return arrastrados
    }
    const caidos = caeAlQuitar(code, modulos.value, cat)
    const fuera = new Set([code, ...caidos])
    modulos.value = modulos.value.filter((m) => !fuera.has(m))
    return caidos
  }

  /**
   * Sustituye la selección entera, cerrando también sus requisitos.
   *
   * <p>Lo usan las tarjetas de combinación y la vuelta al paquete. **No toca el
   * texto que escribió el usuario**: sembrar cambia casillas, nunca su relato.
   */
  function sembrarModulos(codigos: readonly string[]) {
    const cat = catalogo.value
    if (!cat) {
      modulos.value = [...codigos]
      return
    }
    const dentro = [...codigos]
    for (const code of codigos) {
      for (const arrastrado of arrastraAlMarcar(code, dentro, cat)) {
        if (!dentro.includes(arrastrado)) dentro.push(arrastrado)
      }
    }
    modulos.value = dentro
  }

  /** Recupera la combinación que se acaba de perder, con su descuento. */
  function volverAlPaquete() {
    const salto = saltoDePaquete.value
    const cat = catalogo.value
    if (!salto || !cat) return
    sembrarModulos(modulosDelPaquete(salto.paquete, cat))
    saltoDePaquete.value = null
  }

  function descartarSalto() {
    saltoDePaquete.value = null
  }

  onBeforeUnmount(() => {
    limpiarTemporizadores()
    if (temporizadorLimite) clearTimeout(temporizadorLimite)
    preview.cancel()
  })

  return {
    ciclo,
    modulos,
    sedes,
    usuarios,
    catalogo,
    cargandoCatalogo: loading,
    errorCatalogo,
    cotizacion,
    estado,
    lento,
    limitado,
    importe,
    mensajeDeFallo,
    regionViva,
    paquete,
    saltoDePaquete,
    lineas: computed(() => cesta.value?.lineas ?? []),
    alternarModulo,
    sembrarModulos,
    volverAlPaquete,
    descartarSalto,
  }
}
