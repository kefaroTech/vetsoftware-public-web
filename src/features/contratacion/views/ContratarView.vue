<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId } from 'vue'
import { useRouter } from 'vue-router'
import ErrorSummary from '@/components/feedback/ErrorSummary.vue'
import PawLoader from '@/components/feedback/PawLoader.vue'
import { useToast } from '@/composables/useToast'
import { getTraceId } from '@/services/http/http.client'
import { useAuth } from '@/features/auth/composables/useAuth'
import { usePlanes } from '@/features/landing/composables/usePlanes'
import PlanesConfigurador from '@/features/landing/components/PlanesConfigurador.vue'
import type { Ciclo } from '@/features/landing/types/plans.types'
import ContratarResumenTabla from '../components/ContratarResumenTabla.vue'
import DemoModeNotice from '../components/DemoModeNotice.vue'
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
 */
const router = useRouter()
const toast = useToast()
const { companyId } = useAuth()
const { plans, findByCode, loading: cargandoPlanes, refresh: recargarPlanes } = usePlanes()
const { vigente, elegir, descartar, marcarContratada, contratada } = useContratacion()
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
const driftVisible = ref(false)

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
  const intencion = vigente.value
  const plan = findByCode(intencion?.planCode)
  if (!intencion || !plan) {
    resumen.value = null
    cargando.value = false
    return
  }

  resumen.value = await fetchResumenContratacion({
    intencion,
    plan,
    companyId: companyId.value,
    yaTienePlanActivo: contratada.value,
  })

  // §5, caso 6: la empresa ya tiene plan. Aviso `info`, NO `error` — no ha
  // fallado nada—, la intención se descarta para que el enganche del login no
  // la vuelva a disparar, y al tablero.
  if (resumen.value.yaTienePlanActivo) {
    descartar()
    toast.info('Tu clínica ya tiene un plan activo', 'No hace falta contratar otro.')
    void router.replace({ name: 'home' })
    return
  }

  // El velo se quita ANTES del aviso de deriva, y el orden es la diferencia
  // entre que el foco se mueva y que no: mientras `cargando` vale `true` la
  // plantilla pinta «Cargando tu resumen…», así que `PriceDriftNotice` todavía
  // no existe, `driftRef` es `null` y el `focus()` de abajo no llamaba a nadie.
  // El aviso salía en pantalla sin el foco, que es justo la mitad que lo hace
  // cumplir §3.3.4: quien navega con lector no se enteraba de que el precio
  // había cambiado y solo notaba que la casilla se había desmarcado sola.
  cargando.value = false

  // §5, caso 3: el precio se movió mientras decidía.
  if (resumen.value.subtotalMensualEquivalente !== intencion.importeVistoMensual) {
    driftVisible.value = true
    aceptaTerminos.value = false
    terminosTocado.value = false
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

  if (!aceptaTerminos.value || !resumen.value) {
    await nextTick()
    errorRef.value?.focus()
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
      clientRequestId: clientRequestId.value,
    })
    resultadoStore.guardar(resultado)
    marcarContratada()
    await router.push({ name: 'contratar-exito' })
  } catch (e) {
    // El aviso va por `errorFrom`, NUNCA con el texto escrito a mano: es lo que
    // conserva el `X-Trace-Id`, y sin traza soporte no correlaciona nada.
    toast.errorFrom('No se pudo activar el plan', e)
    traceId.value = getTraceId(e)
    // Y además DENTRO de la pantalla: un toast se va solo, y este es el clic más
    // importante de todo el flujo.
    errorEnvio.value =
      'No pudimos activar tu plan. No se ha hecho ningún cambio en tu clínica. Vuelve a intentarlo; si sigue fallando, escríbenos con este código:'
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
        v-if="driftVisible"
        ref="driftRef"
        :antes="vigente?.importeVistoMensual ?? 0"
        :ahora="resumen.subtotalMensualEquivalente"
        sufijo="al mes"
      />

      <ContratarResumenTabla :resumen="resumen" />

      <TrialLinesTable :lineas="resumen.lineasPrueba" />

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
        <label class="ct-check" :for="idTerminos">
          <input
            :id="idTerminos"
            v-model="aceptaTerminos"
            type="checkbox"
            :aria-invalid="!!errorTerminos"
            @blur="terminosTocado = true"
          />
          <span>
            He leído y acepto los <strong>Términos del servicio</strong> y la
            <strong>Política de tratamiento de datos</strong>.
          </span>
        </label>

        <!-- Las dos páginas legales TODAVÍA NO EXISTEN, y por eso aquí no hay
             enlace: un enlace que no navega falla §2.4.4 y enseña al usuario
             que los enlaces de esta web no funcionan. En Colombia el
             tratamiento de datos es una obligación legal (Ley 1581 de 2012),
             así que esto es una dependencia de publicación, no un detalle de
             diseño: este paso no se puede publicar sin ellas. -->
        <p class="ds-meta ds-meta--sm">
          Todavía no están publicadas en la web: pídenoslas en
          <a href="mailto:soporte@vetsoftware.co">soporte@vetsoftware.co</a> y te las enviamos antes
          de que confirmes.
        </p>

        <p class="ds-meta ds-meta--sm">
          Durante la prueba no se cobra nada. Si quieres darte de baja antes de que empiece el
          cobro, escríbenos a
          <a href="mailto:soporte@vetsoftware.co">soporte@vetsoftware.co</a> y lo hacemos.
        </p>

        <div class="ct-actions">
          <button
            type="button"
            class="ds-btn ds-btn--primary ds-btn--lg"
            :disabled="enviando"
            @click="confirmar"
          >
            <PawLoader v-if="enviando" :size="18" :glow="false" :speed="900" />
            {{ enviando ? 'Activando…' : 'Confirmar y activar mi plan' }}
          </button>
          <button type="button" class="ds-btn ds-btn--ghost" :disabled="enviando" @click="ahoraNo">
            Ahora no
          </button>
        </div>

        <p v-if="tardando" class="ds-meta" aria-live="polite">
          Seguimos activando tu plan. No cierres esta ventana.
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

.ct-picker {
  font-family: Inter, system-ui, sans-serif;
}

/* La pila la pone `.ds-stack` desde `primitives.css`. */
.ct-check {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 13.5px;
  line-height: 1.55;
  cursor: pointer;
}

.ct-check input {
  width: 18px;
  height: 18px;
  margin-top: 2px;
  flex-shrink: 0;
}

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
