import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import type { Ref } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from '@/composables/useToast'
import { PERMISSIONS } from '@/constants/permissions'
import { getTraceId } from '@/services/http/http.client'
import { useAuth } from '@/features/auth/composables/useAuth'
import { useAuthorization } from '@/features/auth/composables/useAuthorization'
import { usePlanes } from '@/features/landing/composables/usePlanes'
import type { Ciclo, PublicPlan } from '@/features/landing/types/plans.types'
import { useSuscripcion } from '@/features/suscripcion/composables/useSuscripcion'
import {
  activarPlan,
  fetchResumenContratacion,
  fetchResumenPropuesta,
} from '../api/contratacion.source'
import { useResultadoContratacionStore } from '../stores/resultadoContratacion.store'
import type { ResumenPropuesta, ResumenContratacion } from '../types/contratacion.types'
import { useContratacion } from './useContratacion'

/**
 * LA LÓGICA DEL PASO 6, fuera de la vista.
 *
 * ── Por qué existe este fichero ────────────────────────────────────────────
 * `ContratarView.vue` estaba en 498 líneas contra un techo de 500 que **sí se
 * cumple**: lo mide `scripts/css-budget.mjs` (`maxSfcLines: 500`,
 * `maxOversizedSfc: 0`) dentro de `npm run quality`, así que un SFC que lo pase
 * pone el gate en rojo. Al ganar la pantalla una segunda forma de entrada —una
 * propuesta a medida, que no es un plan— no había sitio, y apretar dos flujos de
 * compra en un fichero al límite habría sido peor que partirlo.
 *
 * <p>El corte no es por longitud: es por naturaleza. Aquí queda **el orden en
 * que ocurren las cosas** —qué se carga, en qué orden, qué puerta se cierra
 * antes de enviar y qué se hace con cada fallo—, y en la vista queda el marcado.
 * Lo que este composable declara con `ref()` es estado **por instancia de la
 * pantalla**, no un singleton de módulo: no hay una sola declaración fuera de la
 * función, así que la regla dura de Pinia se cumple sin discusión. Lo compartido
 * —la intención y el resultado— sigue viviendo en sus stores.
 *
 * ── WCAG §3.3.4 Error Prevention (Legal, Financial, Data), AA ──────────────
 * Se cumple por la vía «Confirmed»: hay un mecanismo para revisar, confirmar y
 * corregir antes de finalizar. Los «Cambiar» del resumen son la parte de
 * corregir; la casilla y el botón separado, la de confirmar.
 *
 * <p><b>Lo que el aviso de deriva NO hace, escrito porque dijo que sí.</b> No
 * desmarca ninguna casilla ya marcada, y no puede: la deriva se detecta en
 * {@link cargar}, y ahí la casilla o no está pintada o acaba de nacer en
 * `false`. Lo que el aviso sí hace es salir ANTES del resumen, con las dos
 * cifras, y llevarse el foco.
 */

/** Lo único que este composable necesita poder hacerle a un nodo: llevarle el foco. */
export interface Enfocable {
  focus: () => void
}

/**
 * Los cuatro nodos a los que esta pantalla lleva el foco.
 *
 * <p>Los declara la VISTA con `useTemplateRef`, y se pasan aquí, en vez de
 * declararlos aquí y dejar que la plantilla los enganche por nombre. Con un
 * `ref` desestructurado del retorno el enganche funciona en tiempo de ejecución
 * pero el compilador no ve el uso, así que `noUnusedLocals` los daba por
 * muertos: cuatro errores de compilación por un enlace que sí existía. Pasarlos
 * como argumento hace explícito quién es el dueño del nodo —la plantilla— y
 * quién decide cuándo se enfoca —esto—.
 */
export interface FocosPaso6 {
  /** El `<h1>`, al entrar en el paso (§2.4.3). */
  h1: Readonly<Ref<HTMLElement | null>>
  /** El aviso de deriva de precio: el foco ES su protección, y es toda la que hay. */
  drift: Readonly<Ref<Enfocable | null>>
  /** El resumen de errores de la casilla de términos. */
  error: Readonly<Ref<Enfocable | null>>
  /** El banner del fallo de envío, que es el clic más importante del flujo. */
  errorEnvio: Readonly<Ref<HTMLElement | null>>
}

/**
 * Por qué no se puede pintar la propuesta que la intención referencia.
 *
 * <p>Dos causas distintas con dos salidas distintas, y por eso no se colapsan:
 *
 *  · `PERDIDA` — este navegador ya no tiene la credencial (otro dispositivo, o
 *    el almacenamiento borrado). La propuesta sigue viva en el servidor; lo que
 *    hay que decirle al usuario es que vuelva a armarla, y el selector de
 *    paquetes de abajo es una salida válida mientras tanto.
 *  · `NO_DISPONIBLE` — el servidor no la devuelve (caducó, o no hay tarifa
 *    publicada). Repetir el camino no la trae de vuelta.
 */
export type MotivoSinPropuesta = 'PERDIDA' | 'NO_DISPONIBLE'

export function usePasoContratar(focos: FocosPaso6) {
  const router = useRouter()
  const toast = useToast()
  const { companyId } = useAuth()
  const { can } = useAuthorization()
  const { plans, findByCode, loading: cargandoPlanes, refresh: recargarPlanes } = usePlanes()
  const { vigente, elegir, descartar, marcarContratada } = useContratacion()
  const { estadoPlanActual, load: cargarSuscripcion } = useSuscripcion()
  const resultadoStore = useResultadoContratacionStore()

  const resumen = ref<ResumenContratacion | null>(null)
  const cargando = ref(true)
  const aceptaTerminos = ref(false)
  const terminosTocado = ref(false)
  const enviando = ref(false)
  const tardando = ref(false)
  const errorEnvio = ref<string | null>(null)
  const traceId = ref<string | undefined>()

  /** `null` mientras la propuesta se pueda pintar, que es el caso normal. */
  const motivoSinPropuesta = ref<MotivoSinPropuesta | null>(null)

  /** La deriva, con SUS DOS CIFRAS dentro: sin las dos, el aviso no puede ser verdad. */
  const drift = ref<{ antes: number; ahora: number } | null>(null)

  /**
   * Llave de idempotencia, generada al ENTRAR en el paso, no al pulsar. Es lo que
   * hace que un doble clic —o una segunda pestaña— no cree dos contratos. No se
   * persiste a propósito: un reintento a los tres días reusaría una llave de hace
   * tres días.
   */
  const clientRequestId = ref('')

  /** Por encima de diez segundos hay que decir algo, o el usuario asume que se colgó. */
  const UMBRAL_LARGO_MS = 10_000
  let temporizadorLargo: ReturnType<typeof setTimeout> | null = null

  /**
   * La puerta del paso vinculante, en el mismo sitio que la del servidor.
   *
   * <p>`POST /quotes/self-serve` exige `quote.request` (`SelfServeQuoteUseCase`), y ese permiso se
   * siembra **solo en nivel `FULL`** (changeset 378): una empresa en mora queda en `READ_ONLY` y
   * NO lo tiene. Eso no es un borde raro, es el estado normal de una clínica que se atrasó en un
   * pago, y el resultado sin esta comprobación sería el peor posible — el botón más importante del
   * embudo, pulsado, girando y devolviendo un 403 sin explicación.
   *
   * <p>Se esconde la acción, no se deshabilita: un botón deshabilitado sin motivo visible se lee
   * como un fallo de la aplicación. En su lugar va una frase que dice quién puede hacerlo, y
   * «Ahora no» sigue ahí — quien no puede contratar tiene que poder salir del embudo.
   */
  const puedeContratar = can(PERMISSIONS.QUOTE_REQUEST)

  /** La segunda puerta: **hay un precio**. El porqué, en `ConfirmarBloqueadoNotice`. */
  const hayPrecio = computed(() => resumen.value?.subtotal != null)

  const puedeConfirmar = computed(() => puedeContratar.value && hayPrecio.value)

  const errorTerminos = computed(() =>
    terminosTocado.value && !aceptaTerminos.value
      ? 'Tienes que aceptar los Términos para continuar.'
      : undefined,
  )

  function nuevoRequestId(): string {
    const c = globalThis.crypto
    if (c && typeof c.randomUUID === 'function') return c.randomUUID()
    return `req-${Date.now()}-${Math.random().toString(16).slice(2)}`
  }

  /**
   * Arma el resumen VINCULANTE, sea cual sea la forma de la intención.
   *
   * <p>La rama de la propuesta **vuelve a preguntarle al servidor** por sus
   * líneas y sus totales en cada apertura de la pantalla: nada del carrito viaja
   * por el almacenamiento, solo la referencia. Es lo que hace que una propuesta
   * editada en otra pestaña entre medias se pinte —y se cotice— como quedó, en
   * vez de como estaba al pulsar «continuar».
   */
  async function cargar() {
    cargando.value = true
    // Sin esto, un aviso de deriva de la selección anterior sobrevive a `elegirAqui()`.
    drift.value = null
    motivoSinPropuesta.value = null

    const intencion = vigente.value
    if (!intencion) {
      resumen.value = null
      cargando.value = false
      return
    }

    // El catálogo solo hace falta en la rama del plan, y se resuelve ANTES de
    // preguntar por la suscripción para no gastar un viaje cuando ya se sabe que
    // no hay nada que resumir.
    let plan: PublicPlan | null = null
    if (intencion.origen === 'PLAN') {
      plan = findByCode(intencion.planCode) ?? null
      if (!plan) {
        resumen.value = null
        cargando.value = false
        return
      }
    }

    // La señal REAL, preguntada al servidor en cada apertura de la pantalla (regla
    // del repositorio: nunca caché vieja al abrir).
    await cargarSuscripcion(true)

    if (intencion.origen === 'PLAN' && plan) {
      resumen.value = await fetchResumenContratacion({
        intencion,
        plan,
        companyId: companyId.value,
        estadoPlanActual: estadoPlanActual.value,
      })
    } else if (intencion.origen === 'PROPUESTA') {
      const resultado = await fetchResumenPropuesta({
        intencion,
        companyId: companyId.value,
        estadoPlanActual: estadoPlanActual.value,
      })
      if (resultado.clase !== 'RESUMEN') {
        // La intención NO se descarta: el prospecto no ha renunciado a nada, y
        // descartarla apagaría además el enganche del login para siempre. Se
        // dice qué pasó y se le deja el selector de paquetes como salida.
        motivoSinPropuesta.value =
          resultado.clase === 'PROPUESTA_PERDIDA' ? 'PERDIDA' : 'NO_DISPONIBLE'
        resumen.value = null
        cargando.value = false
        return
      }
      resumen.value = resultado.resumen
    }

    // §5, caso 6: la empresa ya tiene plan. Aviso `info`, NO `error` —no ha
    // fallado nada—, la intención se descarta para que el enganche del login no
    // la vuelva a disparar, y al tablero.
    //
    // Solo con `CON_PLAN`. Un 403 —el rol sin `subscription.read`— llega como
    // `DESCONOCIDO` y **no** cierra la puerta: echar de aquí a quien quizá no
    // tiene plan por un permiso que no podemos leer es peor que dejarle seguir
    // con un aviso. Lo que tampoco se hace es callarlo: se dice en pantalla.
    if (resumen.value?.estadoPlanActual === 'CON_PLAN') {
      descartar()
      toast.info('Tu clínica ya tiene un plan activo', 'No hace falta contratar otro.')
      void router.replace({ name: 'home' })
      return
    }

    // El velo se quita ANTES del aviso de deriva, y el orden es la diferencia
    // entre que el foco se mueva y que no: mientras `cargando` vale `true` la
    // plantilla pinta «Cargando tu resumen…», así que `PriceDriftNotice` todavía
    // no existe, `focos.drift` es `null` y el `focus()` de abajo no llamaba a nadie.
    cargando.value = false

    // §5, caso 3: el precio se movió mientras decidía.
    //
    // En la rama del plan eso es la lista de precio; en la de la propuesta es
    // **la propuesta misma**, editada o repreciada desde que se trajo al embudo.
    // Los dos operandos van normalizados a MES en los dos lados, y la comparación
    // exige que EXISTAN las dos cifras: un lado vacío no es deriva, es un hueco.
    const antes = intencion.importeVistoMensual
    const ahora = resumen.value?.subtotalMensualEquivalente ?? null
    if (antes !== null && ahora !== null && antes !== ahora) {
      drift.value = { antes, ahora }
      await nextTick()
      focos.drift.value?.focus()
    }
  }

  /** Entrar en el paso: llave nueva, foco al `<h1>` y el catálogo EN LA MANO. */
  async function entrar() {
    clientRequestId.value = nuevoRequestId()
    // Al entrar en un paso el foco tiene que moverse al `<h1>`: tras un
    // `router.push` se queda en el `<body>` y el lector empieza a leer desde la
    // navegación otra vez (§2.4.3).
    await nextTick()
    focos.h1.value?.focus()

    // `usePlanes()` lo pide en SU `onMounted` —que corre antes que este— pero la
    // promesa resuelve DESPUÉS. Sin este `await`, la primera y única pasada de
    // `cargar()` encontraba la lista vacía, `findByCode` devolvía null y la
    // pantalla caía en la rama de «no hay intención»: a quien eligió su plan y
    // volvió tras verificar el correo se le pedía elegir otra vez. `load()`
    // deduplica por `inFlight`, así que esto no dispara una segunda petición.
    await recargarPlanes()
    await cargar()
  }

  onBeforeUnmount(() => {
    if (temporizadorLargo) clearTimeout(temporizadorLargo)
  })

  /** §5, caso 2: no hay intención. No es un error del usuario y no se pinta como tal. */
  const planCode = ref('')
  const ciclo = ref<Ciclo>('MENSUAL')
  const sedes = ref(1)
  const usuarios = ref(1)

  async function elegirAqui() {
    const plan = plans.value.find((p) => p.code === planCode.value) ?? plans.value[0]
    if (!plan) return
    elegir(plan, ciclo.value, sedes.value, usuarios.value)
    await cargar()
  }

  async function confirmar() {
    terminosTocado.value = true
    errorEnvio.value = null
    traceId.value = undefined

    // El cinturón del gate de arriba: sin el permiso el botón no existe, así que llegar aquí solo
    // es posible si el rol cambió con la pantalla abierta. No se manda una petición que el
    // servidor va a rechazar con un 403.
    const actual = resumen.value
    if (!puedeConfirmar.value || !aceptaTerminos.value || !actual) {
      await nextTick()
      focos.error.value?.focus()
      return
    }

    if (actual.origen === 'PLAN') {
      // El plan ENTERO, no solo su código: los rótulos de las capacidades son lo que viaja en las
      // líneas de la oferta y el resumen no los lleva. Si el catálogo se movió y el plan ya no
      // está, no se inventa un cuerpo: se dice y no se envía nada.
      const plan = findByCode(actual.planCode)
      if (!plan) {
        errorEnvio.value =
          'El catálogo de planes cambió mientras confirmabas. Recarga la página y vuelve a elegir; no se ha hecho ningún cambio en tu clínica.'
        await nextTick()
        focos.errorEnvio.value?.focus()
        return
      }
      await enviar({ resumen: actual, plan, clientRequestId: clientRequestId.value })
      return
    }

    // La propuesta no necesita el catálogo: sus líneas ya vienen del servidor con
    // el código que él mismo traduce.
    await enviar({ resumen: actual as ResumenPropuesta, clientRequestId: clientRequestId.value })
  }

  /** El envío, común a las dos formas: es el mismo `POST` con líneas distintas. */
  async function enviar(args: Parameters<typeof activarPlan>[0]) {
    enviando.value = true
    tardando.value = false
    temporizadorLargo = setTimeout(() => {
      tardando.value = true
    }, UMBRAL_LARGO_MS)

    try {
      const resultado = await activarPlan(args)
      resultadoStore.guardar(resultado)
      marcarContratada()
      await router.push({ name: 'contratar-exito' })
    } catch (e) {
      // El aviso va por `errorFrom`, NUNCA con el texto escrito a mano: es lo que
      // conserva el `X-Trace-Id`, y sin traza soporte no correlaciona nada.
      toast.errorFrom('No se pudo registrar tu contratación', e)
      traceId.value = getTraceId(e)
      // Y además DENTRO de la pantalla: un toast se va solo, y este es el clic más
      // importante de todo el flujo.
      errorEnvio.value =
        'No pudimos registrar tu contratación. No se ha hecho ningún cambio en tu clínica y no se te ha cobrado nada. Vuelve a intentarlo; si sigue fallando, escríbenos con este código:'
      await nextTick()
      focos.errorEnvio.value?.focus()
    } finally {
      if (temporizadorLargo) clearTimeout(temporizadorLargo)
      tardando.value = false
      // El botón vuelve al reposo. Nada de dejarlo `disabled` para siempre.
      enviando.value = false
    }
  }

  function ahoraNo() {
    descartar()
    void router.push({ name: 'home' })
  }

  return {
    plans,
    cargandoPlanes,
    resumen,
    cargando,
    aceptaTerminos,
    terminosTocado,
    enviando,
    tardando,
    errorEnvio,
    traceId,
    drift,
    motivoSinPropuesta,
    puedeContratar,
    puedeConfirmar,
    errorTerminos,
    planCode,
    ciclo,
    sedes,
    usuarios,
    entrar,
    cargar,
    elegirAqui,
    confirmar,
    ahoraNo,
  }
}
