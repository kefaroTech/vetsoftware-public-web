import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { CONTRATACION_INTENCION_KEY } from '@/constants/storageKeys'
import type { Ciclo } from '@/features/landing/types/plans.types'
import type {
  CapacidadesElegidas,
  IntencionContratacion,
  SeleccionContratacion,
} from '../types/contratacion.types'

/**
 * La intención de contratación, con espejo en `localStorage`.
 *
 * Vive en un store de Pinia y NO en un `ref()` a nivel de módulo dentro de un
 * composable: la comparten la landing, `/planes`, el carril del registro, el
 * guard del router y las dos pantallas de contratación. Es la definición exacta
 * del estado compartido que la regla dura del repo manda a Pinia.
 *
 * El espejo en almacenamiento es lo que hace que el embudo sobreviva al salto de
 * verificación por correo, que puede durar días. La clave está declarada en
 * `constants/storageKeys.ts`, con el motivo de por qué NO es volátil.
 */

/**
 * Una intención de hace dos meses no es una intención: es basura, y el precio de
 * entonces ya no vale. Treinta días es más de lo que tarda cualquier
 * verificación de correo y menos de lo que tarda una lista de precio en moverse.
 */
export const INTENCION_MAX_DIAS = 30

const MS_POR_DIA = 86_400_000

/** Lo que las dos formas comparten, ya validado. */
type Comun = Omit<IntencionContratacion, 'origen' | 'planCode' | 'propuestaId' | 'modulos'>

/**
 * Valida la forma leída del almacenamiento. Una entrada corrupta se descarta.
 *
 * ── Las DOS migraciones, que no son opcionales ──────────────────────────────
 * Hay navegadores con una intención escrita antes de que existiera `origen`:
 * un objeto con `planCode` y sin discriminador. Descartarla haría que quien
 * eligió su plan ayer y vuelve hoy tras verificar el correo se encontrara el
 * selector otra vez — la conversión exacta que el enganche del login existe para
 * no perder. Se lee como lo que es, `PLAN`.
 *
 * <p>Y hay navegadores con una intención de plan escrita antes de que existiera
 * `modulos`. Se lee con `modulos: []`, que es la forma con la que este front
 * escribe hoy cualquier elección hecha sobre un paquete cerrado: con `planCode`
 * puesto, quien dice qué se contrata es el paquete, así que la intención vieja y
 * la nueva producen la misma oferta. Por eso la clave sigue siendo `v1` y no se
 * sube a `v2` — subirla habría descartado en silencio todas las intenciones
 * vivas para no ganar nada.
 */
function parseIntencion(raw: string | null): IntencionContratacion | null {
  if (!raw) return null
  try {
    const o = JSON.parse(raw) as Record<string, unknown>
    if (o?.ciclo !== 'MENSUAL' && o?.ciclo !== 'ANUAL') return null
    if (typeof o.creadaEn !== 'string') return null

    const comun: Comun = {
      ciclo: o.ciclo,
      sedes: Number.isFinite(o.sedes) ? Number(o.sedes) : 1,
      usuarios: Number.isFinite(o.usuarios) ? Number(o.usuarios) : 1,
      // `null` y no `0`: lo que se guarda aquí es «el importe que el usuario
      // vio», y un cero inventado es una afirmación sobre lo que vio. El paso 6
      // compara este valor para detectar deriva de precio, así que el cero
      // fabricado disparaba el aviso —«Cuando lo elegiste: $ 0»— en cada entrada
      // corrupta o antigua. Sin dato, no hay comparación.
      importeVistoMensual: Number.isFinite(o.importeVistoMensual)
        ? Number(o.importeVistoMensual)
        : null,
      selloRevisadoEl: typeof o.selloRevisadoEl === 'string' ? o.selloRevisadoEl : '',
      creadaEn: o.creadaEn,
      descartada: o.descartada === true,
    }

    if (o.origen === 'PROPUESTA') {
      // Sin referencia no hay nada que releer, y sin relectura no hay líneas ni
      // importes: una intención de propuesta sin `propuestaId` no es una
      // intención a medias, es basura.
      if (typeof o.propuestaId !== 'string' || !o.propuestaId) return null
      return { ...comun, origen: 'PROPUESTA', propuestaId: o.propuestaId }
    }

    const planCode = typeof o.planCode === 'string' && o.planCode ? o.planCode : null

    // Sin discriminador la única señal de que esto era una intención y no basura
    // es el `planCode`, así que la forma vieja sigue exigiéndolo. La nueva no
    // puede: una selección modular no tiene paquete que nombrar.
    if (o.origen !== 'PLAN' && !planCode) return null

    const modulos = Array.isArray(o.modulos)
      ? o.modulos.filter((m): m is string => typeof m === 'string' && m.length > 0)
      : []

    return { ...comun, origen: 'PLAN', planCode, modulos }
  } catch {
    return null
  }
}

export function estaCaducada(intencion: IntencionContratacion, ahora = Date.now()): boolean {
  const nacida = Date.parse(intencion.creadaEn)
  if (Number.isNaN(nacida)) return true
  return ahora - nacida > INTENCION_MAX_DIAS * MS_POR_DIA
}

/** Leer puede lanzar (modo privado, almacenamiento bloqueado): eso no es un fallo del embudo. */
function leerDelAlmacenamiento(): IntencionContratacion | null {
  try {
    return parseIntencion(window.localStorage.getItem(CONTRATACION_INTENCION_KEY))
  } catch {
    return null
  }
}

export const useContratacionStore = defineStore('contratacion', () => {
  const intencion = ref<IntencionContratacion | null>(null)

  // Aquí vivía una bandera `contratada` en memoria, y era la ÚNICA señal con la
  // que el front decidía si la empresa ya tenía plan. Volvía a `false` en cada
  // recarga, así que «tu negocio ya tiene un plan activo» solo saltaba si el
  // usuario acababa de contratar en esa misma pestaña. La señal real es
  // `GET /subscriptions/current` (`suscripcion.api.ts`), que ya existe en el
  // tenant y distingue el 403 del 404; la resuelve `useSuscripcion().
  // estadoPlanActual` y la consume el paso 6. Borrarla de aquí es lo que evita
  // que vuelva a haber dos fuentes de verdad para el mismo hecho.
  //
  // El guard del enganche del login tampoco la necesita: `marcarContratada()`
  // llama a `descartar()`, y una intención descartada ya no es vigente.

  let hidratado = false
  let listenerPuesto = false

  function persistir(): void {
    try {
      if (intencion.value) {
        window.localStorage.setItem(CONTRATACION_INTENCION_KEY, JSON.stringify(intencion.value))
      } else {
        window.localStorage.removeItem(CONTRATACION_INTENCION_KEY)
      }
    } catch {
      // Almacenamiento lleno o bloqueado (modo privado). El embudo sigue
      // funcionando en memoria durante esta pestaña; lo que se pierde es la
      // reanudación, no la compra.
    }
  }

  /**
   * Lee el espejo una sola vez por vida del store, y de paso hace la limpieza de
   * caducidad: una intención vencida se borra del almacenamiento en el mismo
   * acto, para que no reaparezca en la siguiente visita.
   */
  function hidratar(): void {
    if (hidratado) return
    hidratado = true

    let leida = leerDelAlmacenamiento()
    if (leida && estaCaducada(leida)) leida = null
    intencion.value = leida
    if (!leida) persistir()

    // `pagehide` y NO `beforeunload`: en móvil e iOS el navegador puede congelar
    // la pestaña sin disparar nunca el segundo, y además registrar un
    // `beforeunload` descalifica la página para el bfcache y hace más lento el
    // «atrás» de toda la app. Es red de seguridad: las mutaciones ya escriben.
    if (!listenerPuesto && typeof window !== 'undefined') {
      listenerPuesto = true
      window.addEventListener('pagehide', persistir)
    }
  }

  /** La intención que el embudo puede seguir usando: existe, no caducó y no se descartó. */
  const vigente = computed<IntencionContratacion | null>(() => {
    const i = intencion.value
    if (!i || i.descartada || estaCaducada(i)) return null
    return i
  })

  const hayIntencionVigente = computed(() => vigente.value !== null)

  /**
   * Crea o actualiza la intención con una selección del catálogo —un paquete o
   * los módulos sueltos—. Reescribir la selección la «desdescarta».
   */
  function guardar(
    seleccion: SeleccionContratacion,
    importeVistoMensual: number | null,
    sello: string,
  ) {
    hidratar()
    intencion.value = {
      ...seleccion,
      origen: 'PLAN',
      importeVistoMensual,
      selloRevisadoEl: sello,
      creadaEn: new Date().toISOString(),
      descartada: false,
    }
    persistir()
  }

  /**
   * Crea o actualiza la intención con una PROPUESTA a medida.
   *
   * <p>Sustituye a cualquier intención anterior, incluida una de plan: son dos
   * respuestas a la misma pregunta y tener las dos vivas obligaría al paso 6 a
   * elegir por su cuenta cuál manda.
   *
   * @param importeVistoMensual
   *            el subtotal que el prospecto TENÍA DELANTE al pulsar. El
   *            asistente cotiza en mensual por contrato (`totales.ciclo`), así
   *            que es directamente comparable con el que se relea en el paso 6:
   *            es lo que hace que una propuesta editada entre medias salte como
   *            deriva de precio en vez de cambiar de importe en silencio.
   */
  function guardarPropuesta(
    propuestaId: string,
    capacidades: CapacidadesElegidas,
    importeVistoMensual: number | null,
    sello: string,
  ) {
    hidratar()
    intencion.value = {
      ...capacidades,
      origen: 'PROPUESTA',
      propuestaId,
      importeVistoMensual,
      selloRevisadoEl: sello,
      creadaEn: new Date().toISOString(),
      descartada: false,
    }
    persistir()
  }

  function cambiarCiclo(ciclo: Ciclo) {
    const actual = intencion.value
    if (!actual) return
    intencion.value = { ...actual, ciclo }
    persistir()
  }

  /**
   * «Ahora no». No borra: marca. Borrarla haría que el enganche del login
   * volviera a disparar en la siguiente navegación, y eso es una jaula.
   */
  function descartar() {
    if (!intencion.value) return
    intencion.value = { ...intencion.value, descartada: true }
    persistir()
  }

  /** «Empezar de nuevo» de la banda de reanudación: esto sí borra. */
  function limpiar() {
    intencion.value = null
    persistir()
  }

  /**
   * La activación terminó bien: la intención deja de estar vigente para que el
   * enganche del login no vuelva a mandar al usuario al paso 6. **No marca
   * ninguna bandera de «ya tiene plan»**: eso lo dice el servidor.
   */
  function marcarContratada() {
    descartar()
  }

  return {
    intencion,
    vigente,
    hayIntencionVigente,
    hidratar,
    guardar,
    guardarPropuesta,
    cambiarCiclo,
    descartar,
    limpiar,
    marcarContratada,
    persistir,
  }
})
