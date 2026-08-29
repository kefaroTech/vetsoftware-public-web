<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { FileText } from 'lucide-vue-next'
import PageHeader from '@/components/ui/PageHeader.vue'
import SectionCard from '@/components/ui/SectionCard.vue'
import { formatMoney } from '@/composables/money'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import AceptarCotizacionModal from '../components/AceptarCotizacionModal.vue'
import { useCotizaciones } from '../composables/useCotizaciones'
import { SIN_PERMISO } from '../composables/accesoBloqueado'
import { confirmarRechazo, quoteStatusLabel } from '../composables/cotizacionesText'

/**
 * El detalle de una propuesta y sus dos respuestas.
 *
 * <p>Al aceptar se envía y se cita **el importe que se mostró**, capturado al cargar el detalle.
 * Si el que devuelve el servidor difiere, sale un banner con los dos números: **nunca se
 * sobrescribe en silencio**.
 *
 * <p>Tras responder, el foco va al `<h1>` (que lleva `tabindex="-1"`) y no a un botón que puede
 * haber desaparecido del árbol.
 */
const props = defineProps<{ id: string }>()

const {
  quote,
  lineas,
  loading,
  error,
  errorTraceId,
  forbidden,
  totalMostrado,
  avisoImporte,
  vigenciaActual,
  puedeResponder,
  loadDetalle,
  aceptar,
  rechazar,
} = useCotizaciones()

const { confirm } = useConfirmDialog()
const aceptarAbierto = ref(false)
const encabezado = ref<HTMLElement | null>(null)

const cotizacionId = computed(() => Number(props.id))

onMounted(() => void loadDetalle(cotizacionId.value))

/**
 * WCAG 2.2 §2.4.3: tras responder, el foco va al `<h1>` —que sigue existiendo pase lo que
 * pase— y no al botón que acaba de desaparecer del árbol.
 *
 * <p>El `tabindex` se pone aquí y no en `PageHeader`: es una primitiva que montan decenas de
 * pantallas y no todas quieren un encabezado enfocable. Hacerlo en el momento del foco deja el
 * resto del repositorio como estaba.
 */
function devolverFoco() {
  const h1 = encabezado.value?.querySelector<HTMLElement>('h1')
  if (!h1) return
  h1.tabIndex = -1
  h1.focus()
}

async function onAceptar(acceptedByEmail: string) {
  const ok = await aceptar(acceptedByEmail)
  aceptarAbierto.value = false
  if (ok) devolverFoco()
}

async function onRechazar() {
  const ok = await confirm({
    title: 'Rechazar propuesta',
    subtitle: quote.value?.quoteNumber,
    message: confirmarRechazo(quote.value?.quoteNumber),
    confirmLabel: 'Rechazar propuesta',
    busyLabel: 'Rechazando…',
    accent: 'warn',
  })
  if (!ok) return
  const hecho = await rechazar()
  if (hecho) devolverFoco()
}
</script>

<template>
  <div ref="encabezado">
    <PageHeader
      kicker="Mi suscripción"
      :title="quote?.quoteNumber ?? 'Propuesta'"
      :lead="vigenciaActual.texto"
    >
      <template #action>
        <RouterLink
          :to="{ name: 'suscripcion-cotizaciones' }"
          class="ds-btn ds-btn--neutral volver"
        >
          Volver a las propuestas
        </RouterLink>
      </template>
    </PageHeader>

    <p v-if="forbidden" class="ds-empty ds-empty--boxed">{{ SIN_PERMISO }}</p>

    <div v-else-if="error" class="ds-banner ds-banner--error" role="alert">
      <span class="ds-flex-fill">
        {{ error }}
        <span v-if="errorTraceId" class="ds-meta">{{ errorTraceId }}</span>
      </span>
      <button
        type="button"
        class="ds-btn ds-btn--neutral ds-btn--snug"
        @click="loadDetalle(cotizacionId)"
      >
        Reintentar
      </button>
    </div>

    <div v-else-if="quote" class="ds-stack ds-stack--18">
      <!-- El importe cambió mientras se confirmaba: se enseñan los dos y decide la clínica. -->
      <p v-if="avisoImporte" class="ds-banner ds-banner--warning" role="status">
        {{ avisoImporte }}
      </p>

      <SectionCard title="Qué incluye" :icon="FileText">
        <ul v-if="lineas.length > 0" class="ds-list-reset ds-stack ds-stack--8">
          <li v-for="(l, i) in lineas" :key="l.id ?? i" class="ds-flex-row ds-flex-row--12">
            <span class="ds-flex-fill ds-item-label">{{ l.itemName ?? l.itemCode ?? '—' }}</span>
            <span class="ds-meta">{{ l.quantity ?? 0 }} ×</span>
            <span class="ds-num">{{ formatMoney(l.unitAmount ?? 0) }}</span>
            <span class="ds-num">{{ formatMoney(l.lineTotal ?? 0) }}</span>
          </li>
        </ul>
        <!-- `lines[]` va suelto en el contrato: si no llega, se dice, no se pinta vacío. -->
        <p v-else class="ds-empty ds-empty--tight">No pudimos leer las líneas de esta propuesta.</p>
      </SectionCard>

      <SectionCard title="Total">
        <dl class="ds-detail-grid">
          <div>
            <dt class="ds-label">Subtotal</dt>
            <dd class="ds-num">{{ formatMoney(quote.subtotalAmount ?? 0) }}</dd>
          </div>
          <div>
            <dt class="ds-label">Descuento</dt>
            <dd class="ds-num">{{ formatMoney(quote.discountAmount ?? 0) }}</dd>
          </div>
          <div>
            <dt class="ds-label">Impuestos</dt>
            <dd class="ds-num">{{ formatMoney(quote.taxAmount ?? 0) }}</dd>
          </div>
          <div>
            <dt class="ds-label">Total</dt>
            <dd class="ds-num fuerte">{{ formatMoney(quote.totalAmount ?? 0) }}</dd>
          </div>
          <div class="ds-grid-span">
            <dt class="ds-label">Estado</dt>
            <dd class="ds-item-label">{{ quoteStatusLabel(quote.status) }}</dd>
          </div>
        </dl>
      </SectionCard>

      <div v-if="puedeResponder" class="ds-actions">
        <button type="button" class="ds-btn ds-btn--neutral ds-btn--snug" @click="onRechazar">
          Rechazar propuesta
        </button>
        <button
          type="button"
          class="ds-btn ds-btn--primary ds-btn--snug"
          @click="aceptarAbierto = true"
        >
          Aceptar propuesta
        </button>
      </div>
    </div>

    <p v-else-if="!loading" class="ds-empty ds-empty--boxed">No encontramos esta propuesta.</p>

    <AceptarCotizacionModal
      :open="aceptarAbierto"
      :quote="quote"
      :total-mostrado="totalMostrado"
      @close="aceptarAbierto = false"
      @aceptar="onAceptar"
    />
  </div>
</template>

<style scoped>
.volver {
  text-decoration: none;
}

.fuerte {
  font-weight: var(--weight-semibold);
}
</style>
