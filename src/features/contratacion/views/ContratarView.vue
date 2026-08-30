<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId } from 'vue'
import { useRouter } from 'vue-router'
import ErrorSummary from '@/components/feedback/ErrorSummary.vue'
import PawLoader from '@/components/feedback/PawLoader.vue'
import { useToast } from '@/composables/useToast'
import { PERMISSIONS } from '@/constants/permissions'
import { getTraceId } from '@/services/http/http.client'
import { useAuth } from '@/features/auth/composables/useAuth'
import { useAuthorization } from '@/features/auth/composables/useAuthorization'
import { usePlanes } from '@/features/landing/composables/usePlanes'
import LegalConsentCheckbox from '@/features/legal/components/LegalConsentCheckbox.vue'
import { useSuscripcion } from '@/features/suscripcion/composables/useSuscripcion'
import PlanesConfigurador from '@/features/landing/components/PlanesConfigurador.vue'
import type { Ciclo } from '@/features/landing/types/plans.types'
import ConfirmarBloqueadoNotice from '../components/ConfirmarBloqueadoNotice.vue'
import ContratarResumenTabla from '../components/ContratarResumenTabla.vue'
import DemoModeNotice from '../components/DemoModeNotice.vue'
import LetraPequenaPaso6 from '../components/LetraPequenaPaso6.vue'
import PriceDriftNotice from '../components/PriceDriftNotice.vue'
import TrialLinesTable from '../components/TrialLinesTable.vue'
import { activarPlan, fetchResumenContratacion } from '../api/contratacion.source'
import { useContratacion } from '../composables/useContratacion'
import { useResultadoContratacionStore } from '../stores/resultadoContratacion.store'
import type { ResumenContratacion } from '../types/contratacion.types'

/**
 * Paso 6 — el paso VINCULANTE.
 *
 * Va dentro de `/dashboard` pero sin barra lateral (`fullBleed`, `hideTopbar`),
 * con el patrón que ya usa `consulta/nueva`. Es un embudo, y un menú de treinta
 * entradas al lado de un embudo es una invitación a abandonarlo.
 *
 * ── WCAG §3.3.4 Error Prevention (Legal, Financial, Data), AA ──────────────
 * Se cumple por la vía «Confirmed»: hay un mecanismo para revisar, confirmar y
 * corregir antes de finalizar. Los cuatro «Cambiar» del resumen son la parte de
 * corregir; la casilla y el botón separado, la de confirmar.
 *
 * La vía «Reversible» **no** se puede reclamar hoy y la pantalla no la promete:
 * el front del tenant no tiene ninguna superficie de suscripción, así que no
 * hay «cancela cuando quieras». Lo que dice es lo que es verdad: escríbenos.
 *
 * <p><b>Lo que el aviso de deriva NO hace, escrito porque dijo que sí.</b> No
 * desmarca ninguna casilla ya marcada, y no puede: la deriva se detecta en
 * `cargar()`, y ahí la casilla o no está pintada o acaba de nacer en `false`.
 * Había una línea `aceptaTerminos.value = false` que tres docblocks vendían
 * como «la mitad que hace cumplir §3.3.4»; era inalcanzable. Lo que el aviso sí
 * hace es salir ANTES del resumen, con las dos cifras, y llevarse el foco.
 *
 * <p>Re-comprobar al confirmar sería la otra mitad, y hoy no se puede con
 * honradez: `plans.source.ts` devuelve la constante `PLANS_CONTENT` —no hay red
 * tras el catálogo—, así que recalcular compararía un valor contra sí mismo.
 * Cuando el catálogo lea de la red, este es el sitio.
 */
const router = useRouter()
const toast = useToast()
const { companyId } = useAuth()
const { can } = useAuthorization()
const { plans, findByCode, loading: cargandoPlanes, refresh: recargarPlanes } = usePlanes()
const { vigente, elegir, descartar, marcarContratada } = useContratacion()
const { estadoPlanActual, load: cargarSuscripcion } = useSuscripcion()
const resultadoStore = useResultadoContratacionStore()

const uid = useId()
const idTerminos = `${uid}-terminos`

const h1 = ref<HTMLElement | null>(null)
const driftRef = ref<InstanceType<typeof PriceDriftNotice> | null>(null)
const errorRef = ref<InstanceType<typeof ErrorSummary> | null>(null)
const errorEnvioRef = ref<HTMLElement | null>(null)

const resumen = ref<ResumenContratacion | null>(null)
const cargando = ref(true)
const aceptaTerminos = ref(false)
const terminosTocado = ref(false)
const enviando = ref(false)
const tardando = ref(false)
const errorEnvio = ref<string | null>(null)
const traceId = ref<string | undefined>()

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
 *
 * <p>Es la MISMA convención que `SiguientesPasos`: `hasPermission` del rol y la acción
 * desaparece. Aquí se usa `can()` porque el valor se lee en la plantilla y conviene reactivo.
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

const itemsResumenError = computed(() =>
  errorTerminos.value ? [{ id: idTerminos, text: errorTerminos.value }] : [],
)

function nuevoRequestId(): string {
  const c = globalThis.crypto
  if (c && typeof c.randomUUID === 'function') return c.randomUUID()
  return `req-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

async function cargar() {
  cargando.value = true
  // Sin esto, un aviso de deriva de la selección anterior sobrevive a `elegirAqui()`.
  drift.value = null
  const intencion = vigente.value
  const plan = findByCode(intencion?.planCode)
  if (!intencion || !plan) {
    resumen.value = null
    cargando.value = false
    return
  }

  // La señal REAL, preguntada al servidor en cada apertura de la pantalla (regla
  // del repositorio: nunca caché vieja al abrir). Antes esto era una bandera en
  // memoria que volvía a `false` en cada recarga, así que el caso 6 solo se
  // disparaba si el usuario acababa de contratar en esa misma pestaña.
  await cargarSuscripcion(true)

  resumen.value = await fetchResumenContratacion({
    intencion,
    plan,
    companyId: companyId.value,
    estadoPlanActual: estadoPlanActual.value,
  })

  // §5, caso 6: la empresa ya tiene plan. Aviso `info`, NO `error` — no ha
  // fallado nada—, la intención se descarta para que el enganche del login no
  // la vuelva a disparar, y al tablero.
  //
  // Solo con `CON_PLAN`. Un 403 —el rol sin `subscription.read`, que la
  // migración 377 documenta como real— llega como `DESCONOCIDO` y **no** cierra
  // la puerta: echar de aquí a quien quizá no tiene plan por un permiso que no
  // podemos leer es peor que dejarle seguir con un aviso. Lo que tampoco se hace
  // es callarlo: se dice en pantalla, más abajo.
  if (resumen.value.estadoPlanActual === 'CON_PLAN') {
    descartar()
    toast.info('Tu clínica ya tiene un plan activo', 'No hace falta contratar otro.')
    void router.replace({ name: 'home' })
    return
  }

  // El velo se quita ANTES del aviso de deriva, y el orden es la diferencia
  // entre que el foco se mueva y que no: mientras `cargando` vale `true` la
  // plantilla pinta «Cargando tu resumen…», así que `PriceDriftNotice` todavía
  // no existe, `driftRef` es `null` y el `focus()` de abajo no llamaba a nadie.
  // El aviso salía en pantalla sin el foco: quien navega con lector de pantalla
  // no se enteraba de que el precio había cambiado. El foco ES la protección
  // aquí, y es toda la que hay — ver la cabecera del fichero.
  cargando.value = false

  // §5, caso 3: el precio se movió mientras decidía.
  //
  // Los dos operandos van normalizados a MES en los dos lados, así que cambiar de
  // ciclo entre sesiones no se lee como una subida del 900 %. Lo que cambia es que
  // la comparación exige que EXISTAN las dos cifras: un lado vacío no es deriva,
  // es un hueco, y el aviso dice «antes valía esto, ahora esto».
  const antes = intencion.importeVistoMensual
  const ahora = resumen.value.subtotalMensualEquivalente
  //
  // Aquí NO se toca `aceptaTerminos` ni `terminosTocado`: las dos asignaciones a
  // `false` que había eran inalcanzables (mutación inversa: devolverlas no mueve
  // ni una de las 970 pruebas). Ver la cabecera.
  if (antes !== null && ahora !== null && antes !== ahora) {
    drift.value = { antes, ahora }
    await nextTick()
    driftRef.value?.focus()
  }
}

onMounted(async () => {
  clientRequestId.value = nuevoRequestId()
  // Al entrar en un paso el foco tiene que moverse al `<h1>`: tras un
  // `router.push` se queda en el `<body>` y el lector empieza a leer desde la
  // navegación otra vez (§2.4.3).
  await nextTick()
  h1.value?.focus()

  // ── El catálogo, EN LA MANO, antes de decidir nada ────────────────────────
  // `usePlanes()` lo pide en SU `onMounted` —que corre antes que este, porque se
  // registra antes— pero la promesa resuelve DESPUÉS. Sin este `await`, la
  // primera y única pasada de `cargar()` encontraba la lista vacía, `findByCode`
  // devolvía null y la pantalla caía en la rama de «no hay intención»: a quien
  // eligió su plan y volvió tras verificar el correo se le pedía elegir otra
  // vez, que es exactamente la conversión que el enganche del login (§3.5)
  // existe para no perder. Y peor: la comprobación de deriva de precio (§5,
  // caso 3) vive dentro de `cargar()`, así que tampoco llegaba a ejecutarse
  // nunca. `load()` deduplica por `inFlight`, así que esto no dispara una
  // segunda petición: espera a la que ya está en vuelo.
  await recargarPlanes()
  await cargar()
})

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
  if (!puedeConfirmar.value || !aceptaTerminos.value || !resumen.value) {
    await nextTick()
    errorRef.value?.focus()
    return
  }

  // El plan ENTERO, no solo su código: los rótulos de las capacidades son lo que viaja en las
  // líneas de la oferta y el resumen no los lleva. Si el catálogo se movió y el plan ya no está,
  // no se inventa un cuerpo: se dice y no se envía nada.
  const plan = findByCode(resumen.value.planCode)
  if (!plan) {
    errorEnvio.value =
      'El catálogo de planes cambió mientras confirmabas. Recarga la página y vuelve a elegir; no se ha hecho ningún cambio en tu clínica.'
    await nextTick()
    errorEnvioRef.value?.focus()
    return
  }

  enviando.value = true
  tardando.value = false
  temporizadorLargo = setTimeout(() => {
    tardando.value = true
  }, UMBRAL_LARGO_MS)

  try {
    const resultado = await activarPlan({
      resumen: resumen.value,
      plan,
      clientRequestId: clientRequestId.value,
    })
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
    errorEnvioRef.value?.focus()
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
</script>

<template>
  <!-- `data-testid` y no el rol `main`: bajo `AppLayout` esta pantalla queda
       ANIDADA dentro del `<main class="app-content">` del armazón, así que
       `getByRole('main')` casa con dos elementos y ninguna prueba podría
       apuntar a este sin ambigüedad. Mismo patrón que ya trae
       `consulta/nueva`. -->
  <main class="ds-page ds-page--contained ds-stack ds-stack--16 ct" data-testid="paso-contratar">
    <h1 ref="h1" class="ds-display ds-display--sm" tabindex="-1">Confirma tu plan</h1>

    <template v-if="cargando || cargandoPlanes">
      <p class="ds-meta">Cargando tu resumen…</p>
    </template>

    <!-- §5, caso 2: la intención no está (otro dispositivo, o borró el
         almacenamiento). Un usuario que perdió un borrador no cometió ningún
         fallo, y tratarlo como si lo hubiera cometido es la forma más rápida de
         que se vaya. Así que aquí NO hay error: hay selector. -->
    <template v-else-if="!resumen">
      <p class="ds-subtitle">Vamos a elegir el plan de tu clínica. Te lleva un minuto.</p>
      <div class="pub-scope ct-picker">
        <PlanesConfigurador
          v-model:plan-code="planCode"
          v-model:ciclo="ciclo"
          v-model:sedes="sedes"
          v-model:usuarios="usuarios"
          :plans="plans"
          @continuar="elegirAqui"
        />
      </div>
    </template>

    <template v-else>
      <p class="ds-subtitle">
        Estás contratando para <strong>{{ resumen.empresaNombre }}</strong
        ><span v-if="resumen.empresaIdentificador"> (NIT {{ resumen.empresaIdentificador }})</span>.
      </p>

      <PriceDriftNotice
        v-if="drift"
        ref="driftRef"
        :antes="drift.antes"
        :ahora="drift.ahora"
        sufijo="al mes"
      />

      <!-- No se pudo leer la suscripción (403 del rol sin `subscription.read`, o un fallo del
           servidor). No se echa al usuario del embudo, pero tampoco se le deja creer que se
           comprobó: si su clínica ya tuviera plan, contratar otro es un problema caro. -->
      <p
        v-if="resumen.estadoPlanActual === 'DESCONOCIDO'"
        class="ds-banner ds-banner--warning"
        role="status"
      >
        No pudimos comprobar si tu clínica ya tiene un plan contratado. Si crees que ya lo tiene,
        escríbenos a <a href="mailto:soporte@vetsoftware.co">soporte@vetsoftware.co</a> antes de
        confirmar.
      </p>

      <!-- El ORDEN decide qué se cree, y estaba al revés. Primero qué se paga hoy —nada, y
           hasta cuándo, por módulo—, y solo después el importe del ciclo, que es lo que se
           cobrará cuando la prueba termine. Antes la pantalla abría con «Total del primer mes:
           $105.910» y lo desmentía dos bloques más abajo, en el momento exacto en que alguien
           decide una compra: tres afirmaciones incompatibles y ninguna jerarquía. -->
      <TrialLinesTable :lineas="resumen.lineasPrueba" />

      <ContratarResumenTabla :resumen="resumen" />

      <DemoModeNotice />

      <ErrorSummary v-if="itemsResumenError.length > 0" ref="errorRef" :items="itemsResumenError" />

      <div
        v-if="errorEnvio"
        ref="errorEnvioRef"
        class="ds-banner ds-banner--error ct-error"
        role="alert"
        tabindex="-1"
      >
        <p class="ct-error-text">
          {{ errorEnvio }}
          <code v-if="traceId" class="ct-trace">{{ traceId }}</code>
        </p>
      </div>

      <div class="ds-stack ds-stack--10">
        <!-- Sin `quote.request` no hay nada que aceptar: la casilla de términos existe para
             habilitar un botón que no se va a pintar, y pedir que se acepten unos términos para
             después no dejar continuar es la peor forma de comunicar una falta de permiso.

             Los dos documentos se NOMBRABAN en negrita y no se enlazaban, porque las páginas no
             existían. Ya existen, y la casilla las enlaza: una casilla que dice «he leído» algo
             que no se puede leer recoge un clic, no el consentimiento informado que exige el
             artículo 9 de la Ley 1581 de 2012. `LegalConsentCheckbox` añade además la versión
             aceptada, que es lo que convierte «aceptó la política» en una afirmación con
             referente. -->
        <LegalConsentCheckbox
          v-if="puedeConfirmar"
          :id="idTerminos"
          v-model="aceptaTerminos"
          :documentos="['TERMS_OF_SERVICE', 'PRIVACY_POLICY']"
          :invalid="!!errorTerminos"
          @blur="terminosTocado = true"
        />

        <ConfirmarBloqueadoNotice
          v-else
          :motivo="puedeContratar ? 'SIN_PRECIO' : 'PERMISO'"
          :sin-precio="resumen.sinPrecio"
          :ciclo="resumen.ciclo"
        />

        <LetraPequenaPaso6 />

        <div class="ct-actions">
          <!-- Ausente, no deshabilitado: ver `puedeContratar`. «Ahora no» se queda en los dos
               casos — quien no puede contratar tiene que poder salir del embudo. -->
          <button
            v-if="puedeConfirmar"
            type="button"
            class="ds-btn ds-btn--primary ds-btn--lg"
            :disabled="enviando"
            @click="confirmar"
          >
            <PawLoader v-if="enviando" :size="18" :glow="false" :speed="900" />
            {{ enviando ? 'Confirmando…' : 'Confirmar mi plan' }}
          </button>
          <button type="button" class="ds-btn ds-btn--ghost" :disabled="enviando" @click="ahoraNo">
            Ahora no
          </button>
        </div>

        <p v-if="tardando" class="ds-meta" aria-live="polite">
          Seguimos registrando tu contratación. No cierres esta ventana.
        </p>
      </div>
    </template>
  </main>
</template>

<style scoped>
.ct {
  max-width: 780px;

  /* Bajo `fullBleed` el contenedor de la app es `overflow: hidden` y una
     columna flexible: quien rueda tiene que ser esta pantalla. */
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.ct-error:focus {
  outline-offset: 2px;
}

.ct h1:focus,
.ct-picker :focus-visible {
  outline-offset: 2px;
}

/* `.pub-scope` está en el marcado porque el configurador se pinta ENTERO con los tokens
   `--pub-*`, que solo existen bajo esa clase: quitarla lo deja sin un solo color. Lo que sí se
   quita es su tipografía —`.pub-scope` fija Inter, y esta pantalla la repetía—, porque dentro del
   producto autenticado eso se lee como otra aplicación. Y esta rama no es rara: se ejecuta cada
   vez que alguien verificó su correo desde el móvil y vuelve sin la intención. */
.ct-picker {
  font-family: var(--font-sans);
  color: var(--warm-900);
}

/* La pila la pone `.ds-stack` desde `primitives.css`. */
.ct-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.ct-error-text {
  margin: 0;
  font-size: 13px;
  line-height: 1.55;
}

.ct-trace {
  display: block;
  margin-top: 6px;
  font-family: ui-monospace, Menlo, monospace;
  font-size: 11.5px;
}
</style>
