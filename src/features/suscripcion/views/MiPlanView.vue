<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { CreditCard, FileText, ShieldCheck } from 'lucide-vue-next'
import PageHeader from '@/components/ui/PageHeader.vue'
import SectionCard from '@/components/ui/SectionCard.vue'
import { formatDateShort, todayISO } from '@/composables/format'
import { formatMoney } from '@/composables/money'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { useToast } from '@/composables/useToast'
import CambiarCantidadModal from '../components/CambiarCantidadModal.vue'
import { useSuscripcion } from '../composables/useSuscripcion'
import { useCupos } from '../composables/useCupos'
import { SIN_PERMISO } from '../composables/accesoBloqueado'
import { cicloLabel, estadoRotulo } from '../composables/estadoSuscripcion'
import {
  avisoPermanencia,
  confirmarBaja,
  confirmarQuitarLinea,
} from '../composables/cotizacionesText'
import { suscripcionApi } from '../api/suscripcion.api'
import type { SubscriptionItemResponse } from '../types/suscripcion.types'

/**
 * «¿Qué tengo contratado, en qué estado y qué me cuesta?» — y la pregunta que de verdad
 * importa: **es la pantalla que explica por qué un botón está apagado**.
 *
 * <p>Los datos se pintan como **hechos** (`<dl>` sobre `.ds-detail-grid`), nunca como
 * `<input disabled>`: un campo gris dice «editable, pero ahora no», y aquí no hay ninguna
 * edición que exista. De paso evita el problema de contraste de un control deshabilitado.
 */
const { subscription, items, loading, error, errorTraceId, forbidden, notFound, baja, load } =
  useSuscripcion()
const { entitlements, entitlementsLegibles, cupos, load: loadCupos } = useCupos()
const { confirm } = useConfirmDialog()
const toast = useToast()

const cantidadAbierta = ref(false)
const itemEnEdicion = ref<SubscriptionItemResponse | null>(null)

onMounted(() => {
  void load(true)
  void loadCupos(true)
})

const totalPlan = computed(() =>
  items.value.reduce((acc, it) => acc + (it.unitAmount ?? 0) * (it.quantity ?? 0), 0),
)

/** Consumo de la dimensión que mide una línea, si el cruce por unidad de capacidad lo permite. */
function consumoDe(item: SubscriptionItemResponse): { usado: number | null; code?: string } {
  const cupo = cupos.value.find((c) => c.capacidad.dimensionCode === item.capacityUnit)
  return { usado: cupo?.capacidad.usedQuantity ?? null, code: cupo?.capacidad.dimensionCode }
}

function lineaTotal(item: SubscriptionItemResponse): number {
  return (item.unitAmount ?? 0) * (item.quantity ?? 0)
}

function nuevoClientRequestId(): string {
  return crypto.randomUUID()
}

/**
 * Pedir la baja. Va por el diálogo único del repositorio y no por un modal a medida: no hace
 * falta ningún campo, y el diálogo ya resuelve foco, Escape y doble clic.
 *
 * <p>El botón **nombra la acción**: «Pedir la baja de mi plan». No «Cancelar» — en un modal ese
 * es el botón de cerrar, y dos botones que dicen «Cancelar» son un accidente esperando.
 */
async function pedirBaja() {
  const sub = subscription.value
  if (!sub) return
  const efectiva = sub.cancelEffectiveDate ?? sub.currentPeriodEnd
  const permanencia =
    sub.commitmentEndDate && sub.commitmentEndDate > todayISO()
      ? avisoPermanencia(sub.commitmentEndDate)
      : undefined
  try {
    const ok = await confirm({
      title: 'Pedir la baja de mi plan',
      message: confirmarBaja(efectiva),
      consequence: permanencia,
      accent: 'warn',
      confirmLabel: 'Pedir la baja de mi plan',
      busyLabel: 'Enviando…',
      action: () =>
        suscripcionApi.cancel(sub.id, {
          requestedAt: new Date().toISOString(),
          effectiveDate: efectiva ?? todayISO(),
          clientRequestId: nuevoClientRequestId(),
        }),
    })
    if (!ok) return
    await load(true)
  } catch (e: unknown) {
    toast.errorFrom('No se pudo registrar la baja', e)
  }
}

async function quitarLinea(item: SubscriptionItemResponse) {
  const sub = subscription.value
  if (!sub) return
  try {
    const ok = await confirm({
      title: 'Quitar del plan',
      subtitle: item.itemName,
      message: confirmarQuitarLinea(item.itemName),
      accent: 'warn',
      confirmLabel: 'Quitar del plan',
      busyLabel: 'Quitando…',
      action: () =>
        suscripcionApi.removeItem(sub.id, {
          subscriptionItemId: item.id,
          clientRequestId: nuevoClientRequestId(),
          effectiveDate: sub.currentPeriodEnd ?? todayISO(),
        }),
    })
    if (!ok) return
    await load(true)
  } catch (e: unknown) {
    toast.errorFrom('No se pudo quitar la línea', e)
  }
}

function abrirCantidad(item: SubscriptionItemResponse) {
  itemEnEdicion.value = item
  cantidadAbierta.value = true
}

async function guardarCantidad(newQuantity: number) {
  const sub = subscription.value
  const item = itemEnEdicion.value
  if (!sub || !item) return
  try {
    await suscripcionApi.changeItemQuantity(sub.id, {
      subscriptionItemId: item.id,
      newQuantity,
      clientRequestId: nuevoClientRequestId(),
      effectiveDate: sub.currentPeriodEnd ?? todayISO(),
    })
    cantidadAbierta.value = false
    toast.success('Cantidad actualizada', item.itemName)
    await load(true)
  } catch (e: unknown) {
    toast.errorFrom('No se pudo cambiar la cantidad', e)
  }
}
</script>

<template>
  <div>
    <PageHeader kicker="Mi suscripción" title="Mi plan" />

    <p v-if="forbidden" class="ds-empty ds-empty--boxed">{{ SIN_PERMISO }}</p>

    <!-- Sin plan NO se pinta un plan a cero. -->
    <p v-else-if="notFound" class="ds-empty ds-empty--boxed">
      No encontramos un plan activo para tu clínica. Si crees que es un error, escríbenos.
    </p>

    <!-- La rama de error va ANTES que la de vacío: un fallo del servidor no es «no hay nada». -->
    <div v-else-if="error" class="ds-banner ds-banner--error" role="alert">
      <span class="ds-flex-fill">
        {{ error }}
        <span v-if="errorTraceId" class="ds-meta">{{ errorTraceId }}</span>
      </span>
      <button type="button" class="ds-btn ds-btn--neutral ds-btn--snug" @click="load(true)">
        Reintentar
      </button>
    </div>

    <div v-else-if="subscription" class="ds-stack ds-stack--18">
      <SectionCard title="Tu plan" :icon="CreditCard">
        <dl class="ds-detail-grid">
          <div>
            <dt class="ds-label">Estado</dt>
            <dd class="ds-item-label">{{ estadoRotulo(subscription.status) }}</dd>
          </div>
          <div>
            <dt class="ds-label">Número</dt>
            <dd class="ds-item-label">{{ subscription.subscriptionNumber }}</dd>
          </div>
          <div>
            <dt class="ds-label">Ciclo de cobro</dt>
            <dd class="ds-item-label">{{ cicloLabel(subscription.billingCycle) }}</dd>
          </div>
          <div>
            <dt class="ds-label">Desde</dt>
            <dd class="ds-item-label">{{ formatDateShort(subscription.startDate) }}</dd>
          </div>
          <div>
            <dt class="ds-label">Próximo cobro</dt>
            <dd class="ds-item-label">{{ formatDateShort(subscription.nextBillingDate) }}</dd>
          </div>
          <div v-if="subscription.trialEndDate">
            <dt class="ds-label">Fin de la prueba</dt>
            <dd class="ds-item-label">{{ formatDateShort(subscription.trialEndDate) }}</dd>
          </div>
          <div>
            <dt class="ds-label">Renovación</dt>
            <dd class="ds-item-label">
              {{ subscription.autoRenew ? 'Se renueva sola' : 'No se renueva sola' }}
            </dd>
          </div>
          <div v-if="subscription.commitmentEndDate">
            <dt class="ds-label">Permanencia</dt>
            <dd class="ds-item-label">
              hasta el {{ formatDateShort(subscription.commitmentEndDate) }}
            </dd>
          </div>
        </dl>
      </SectionCard>

      <!-- Hecho permanente del plan, no aviso: sin tono ni banner. -->
      <SectionCard v-if="baja" title="Baja registrada">
        <p class="ds-meta">{{ baja }}</p>
      </SectionCard>

      <SectionCard title="Lo que incluye tu plan" :icon="FileText">
        <ul class="ds-list-reset ds-stack ds-stack--10">
          <li v-for="item in items" :key="item.id" class="ds-flex-row ds-flex-row--12">
            <span class="ds-flex-fill ds-item-label">{{ item.itemName ?? item.itemCode }}</span>
            <span class="ds-meta">{{ item.quantity ?? 0 }} ×</span>
            <span class="ds-num">{{ formatMoney(item.unitAmount ?? 0) }}</span>
            <span class="ds-num total">{{ formatMoney(lineaTotal(item)) }}</span>
            <button
              type="button"
              class="ds-btn ds-btn--neutral ds-btn--snug"
              @click="abrirCantidad(item)"
            >
              Cambiar cantidad
            </button>
            <button
              type="button"
              class="ds-btn ds-btn--plain ds-btn--snug"
              @click="quitarLinea(item)"
            >
              Quitar
            </button>
          </li>
        </ul>
        <p v-if="items.length === 0" class="ds-empty ds-empty--tight">
          Tu plan todavía no tiene líneas registradas.
        </p>
        <p v-else class="ds-num total pie">Total: {{ formatMoney(totalPlan) }}</p>
      </SectionCard>

      <SectionCard title="Módulos activos" :icon="ShieldCheck">
        <ul v-if="entitlementsLegibles" class="ds-list-reset ds-stack ds-stack--8">
          <li v-for="ent in entitlements" :key="ent.id ?? ent.subModule?.code" class="ds-flex-row">
            <span class="ds-flex-fill ds-item-label">{{ ent.subModule?.name ?? '—' }}</span>
            <span class="ds-meta">{{ ent.accessLevel ?? '—' }}</span>
          </li>
        </ul>
        <!-- No se degrada a «sin módulos»: decir que no hay cuando no se pudo leer es mentir. -->
        <p v-else class="ds-meta">No pudimos leer tus módulos activos.</p>
        <p
          v-if="entitlementsLegibles && entitlements.length === 0"
          class="ds-empty ds-empty--tight"
        >
          Tu plan no tiene módulos registrados.
        </p>
      </SectionCard>

      <div class="ds-actions">
        <button type="button" class="ds-btn ds-btn--danger ds-btn--snug" @click="pedirBaja">
          Pedir la baja de mi plan
        </button>
      </div>
    </div>

    <p v-else-if="!loading" class="ds-empty ds-empty--boxed">
      No encontramos un plan activo para tu clínica. Si crees que es un error, escríbenos.
    </p>

    <CambiarCantidadModal
      :open="cantidadAbierta"
      :item="itemEnEdicion"
      :usado="itemEnEdicion ? consumoDe(itemEnEdicion).usado : null"
      :dimension-code="itemEnEdicion ? consumoDe(itemEnEdicion).code : undefined"
      @close="cantidadAbierta = false"
      @guardar="guardarCantidad"
    />
  </div>
</template>

<style scoped>
.total {
  font-weight: var(--weight-semibold);
}

.pie {
  margin-top: var(--space-14);
  text-align: right;
}
</style>
