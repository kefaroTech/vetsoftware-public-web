<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { formatDateLong } from '@/composables/format'
import { importeEstimado, sufijoConImpuesto } from '@/features/landing/composables/planPricing'
import { CICLO_LABEL } from '@/features/landing/types/plans.types'
import SiguientesPasos from '../components/SiguientesPasos.vue'
import TrialLinesTable from '../components/TrialLinesTable.vue'
import { sumarDias } from '../api/contratacion.source'
import { wompiApi } from '../api/pago.api'
import { useResultadoContratacionStore } from '../stores/resultadoContratacion.store'
import type { FirstPeriodPaymentStatus } from '../types/contratacion.types'

/**
 * Paso 7 — el momento más importante, y el que peor se resuelve siempre.
 *
 * <p>El cobro es real y anticipado (§1 de la especificación de Wompi): esta pantalla ya no puede
 * decir «Reservado» y quedarse ahí, porque lo que pasó con la tarjeta es justo lo que decide si el
 * plan queda activo. Sondea `GET /payment-gateway/wompi/first-period-payment` cada
 * {@link INTERVALO_MS} hasta que Wompi responde `APPROVED`/`DECLINED` o pasan
 * {@link DURACION_MAX_MS} — mientras tanto, y si el plazo se agota en `PENDING`, el aviso dice que
 * se está confirmando con el banco: el webhook (`ProcessWompiEventUseCase`) cierra ese estado más
 * tarde, y esta pantalla no vuelve a preguntarlo.
 *
 * <p>Sin resultado en el store no hay nada que contar —una recarga a la semana, un enlace
 * pegado—, y la pantalla manda al tablero en vez de repetir una activación vieja como si acabara
 * de ocurrir.
 */
const router = useRouter()
const resultadoStore = useResultadoContratacionStore()
const { resultado } = storeToRefs(resultadoStore)

const h1 = ref<HTMLElement | null>(null)

/**
 * Cuántos módulos quedaron reservados, contados sobre las líneas que se pintan
 * debajo. Se dice el número y no «el núcleo y N»: distinguir cuál de esas
 * líneas es el mínimo estructural exige el catálogo, y esta pantalla no lo
 * tiene — inventarlo sería contar mal en la frase que resume una compra.
 */
const cuantosModulos = computed(() => resultado.value?.modulosActivados.length ?? 0)

const modulos = computed(() => {
  const nombres = resultado.value?.modulosActivados ?? []
  if (nombres.length <= 1) return nombres[0] ?? ''
  return `${nombres.slice(0, -1).join(', ')} y ${nombres.at(-1)}`
})

/** El primer cobro es el día siguiente al final de la prueba que termina antes. */
const primerCobro = computed(() => {
  const primera = resultado.value?.lineasPrueba[0]
  return primera ? sumarDias(primera.trialEndDate, 1) : null
})

const INTERVALO_MS = 2000
const DURACION_MAX_MS = 20_000

const estadoPago = ref<FirstPeriodPaymentStatus | null>(null)
let detenido = false

function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Deja de sondear en cuanto la respuesta es final, o al agotar el plazo. */
async function sondear() {
  const inicio = Date.now()
  while (!detenido && Date.now() - inicio < DURACION_MAX_MS) {
    let respuesta
    try {
      respuesta = await wompiApi.primerPago()
    } catch {
      // Un fallo de red aquí no es el desenlace del cobro: se deja de sondear y el estado se
      // queda como estaba (o `NOT_ATTEMPTED` de entrada), sin fingir un resultado que no se leyó.
      return
    }
    if (detenido) return
    estadoPago.value = respuesta.status
    if (resultado.value) {
      resultadoStore.guardar({
        ...resultado.value,
        pago: { status: respuesta.status, amount: respuesta.amount, currency: respuesta.currency },
      })
    }
    if (respuesta.status === 'APPROVED' || respuesta.status === 'DECLINED') return
    await esperar(INTERVALO_MS)
  }
}

onBeforeUnmount(() => {
  detenido = true
})

onMounted(async () => {
  if (!resultado.value) {
    void router.replace({ name: 'home' })
    return
  }
  await nextTick()
  h1.value?.focus()
  await sondear()
})

const INSIGNIA: Record<FirstPeriodPaymentStatus, string> = {
  APPROVED: 'Pago aprobado',
  PENDING: 'Confirmando tu pago',
  DECLINED: 'Pago rechazado',
  NOT_ATTEMPTED: 'Confirmando tu pago',
}

const insignia = computed(() => INSIGNIA[estadoPago.value ?? 'NOT_ATTEMPTED'])

const tonoInsignia = computed(() => {
  if (estadoPago.value === 'APPROVED') return 'ds-tone--success'
  if (estadoPago.value === 'DECLINED') return 'ds-tone--danger'
  return 'ds-tone--warning'
})

const bannerClase = computed(() =>
  estadoPago.value === 'APPROVED'
    ? 'ds-banner--success'
    : estadoPago.value === 'DECLINED'
      ? 'ds-banner--error'
      : 'ds-banner--warning',
)

/** Los tres textos exactos de la especificación (§4.4). `NOT_ATTEMPTED` cuenta como pendiente:
 * es lo mismo que ve el usuario — todavía no hay una respuesta que contar. */
const mensajePago = computed(() => {
  if (estadoPago.value === 'APPROVED') return 'Pago aprobado: tu plan está activo.'
  if (estadoPago.value === 'DECLINED') return 'No pudimos cobrar tu tarjeta.'
  return 'Estamos confirmando el pago con tu banco; te avisaremos.'
})

// El título de la pestaña reflejaba «reservado» incondicionalmente. Se corrige aquí, no en el
// `meta.title` de la ruta: ese valor es estático y se fija ANTES de saber qué contestó Wompi.
watch(estadoPago, (v) => {
  if (v) document.title = `${INSIGNIA[v]} — Lumbre`
})
</script>

<template>
  <main
    v-if="resultado"
    class="ds-page ds-page--contained ds-stack ds-stack--16 ex"
    data-testid="contratacion-exito"
  >
    <p class="ex-insignia ds-pill" :class="tonoInsignia">{{ insignia }}</p>

    <h1 ref="h1" class="ds-display ds-display--sm" tabindex="-1">
      <template v-if="resultado.origen === 'PLAN'">
        Contrataste tu plan con {{ cuantosModulos }}
        {{ cuantosModulos === 1 ? 'módulo' : 'módulos' }}.
      </template>
      <template v-else> {{ resultado.titulo }} quedó contratada. </template>
    </h1>
    <p class="ds-subtitle">
      <template v-if="resultado.origen === 'PLAN'">{{ resultado.titulo }}. </template>
      {{ modulos }} son los módulos que contrataste para
      <strong>{{ resultado.empresaNombre }}</strong
      >.
    </p>

    <p class="ds-banner" :class="bannerClase" role="status" aria-live="polite">
      {{ mensajePago }}
      <RouterLink v-if="estadoPago === 'DECLINED'" :to="{ name: 'suscripcion-medios-pago' }">
        Actualiza tu medio de pago
      </RouterLink>
    </p>

    <section class="ds-stack ds-stack--10" aria-labelledby="cobro-titulo">
      <h2 id="cobro-titulo" class="ds-title">Qué se va a cobrar, módulo por módulo</h2>

      <TrialLinesTable :lineas="resultado.lineasPrueba" />

      <!-- El `total` del servidor, no el subtotal: «IVA incluido» solo puede acompañar a la
           cifra que de verdad lo lleva dentro. El desglose por línea queda en el paso anterior,
           que es donde el comprador tiene que poder ver la base gravable antes de confirmar. -->
      <p class="ds-meta ex-importes">
        {{ CICLO_LABEL[resultado.ciclo] }} ·
        <strong>{{ importeEstimado(resultado.total) }}</strong>
        {{ sufijoConImpuesto(resultado.ciclo) }}.
        <template v-if="primerCobro">
          Primer cobro previsto: {{ formatDateLong(primerCobro) }}.
        </template>
        Te avisamos por correo antes del primer cobro.
      </p>

      <p class="ds-meta">
        Ya registramos tu contratación
        <template v-if="resultado.cotizacionNumero">
          con el número <strong>{{ resultado.cotizacionNumero }}</strong>
        </template>
        <template v-if="resultado.validaHasta">
          , válida hasta el {{ formatDateLong(resultado.validaHasta) }}</template
        >.
      </p>
    </section>

    <section class="ds-stack ds-stack--10" aria-labelledby="ahora-titulo">
      <!-- «Tres cosas» prometía un número que el permiso del usuario puede no permitir:
           `SiguientesPasos` oculta la tarjeta cuyo destino el rol no alcanza. -->
      <h2 id="ahora-titulo" class="ds-title">Qué hacer ahora</h2>
      <SiguientesPasos />
    </section>
  </main>
</template>

<style scoped>
.ex {
  max-width: 860px;
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.ex-insignia {
  align-self: flex-start;
  margin: 0;
}

.ex h1:focus,
.ex h1:focus-visible {
  outline-offset: 3px;
}

.ex-importes {
  padding: var(--space-14);
  border-radius: var(--radius-panel);
  background: var(--amatista-50);
  line-height: 1.6;
}
</style>
