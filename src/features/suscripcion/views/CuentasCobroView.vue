<script setup lang="ts">
import { computed, onMounted, ref, useTemplateRef } from 'vue'
import { Receipt, Wallet } from 'lucide-vue-next'
import PageHeader from '@/components/ui/PageHeader.vue'
import SectionCard from '@/components/ui/SectionCard.vue'
import Pagination from '@/components/ui/Pagination.vue'
import { useScrollableRegion } from '@/composables/useScrollableRegion'
import { useServerPaged } from '@/composables/useServerPaged'
import { formatDateShort } from '@/composables/format'
import { formatMoney } from '@/composables/money'
import DocumentoCobroFila from '../components/DocumentoCobroFila.vue'
import { useCobros } from '../composables/useCobros'
import { useSuscripcion } from '../composables/useSuscripcion'
import {
  CABECERA_SOLO_LECTURA,
  MONEY_LABELS,
  SIN_DOCUMENTOS,
  dunningLabel,
  estaVencida,
  paymentMethodLabel,
  paymentStatusLabel,
  saldoAFavorTexto,
} from '../composables/cobrosText'
import { cobrosApi } from '../api/cobros.api'
import type { BillingDocumentResponse, SubscriptionPaymentResponse } from '../types/cobros.types'

/**
 * Mis cuentas de cobro. **SOLO LECTURA, y se dice en la pantalla.**
 *
 * <p>No es una limitación que haya que esconder: es la aclaración que evita que alguien busque
 * durante cinco minutos el botón de «pagar» que no existe. `POST /subscription-payments` es de
 * plataforma — **la clínica no registra su propio pago**.
 *
 * <p>Los listados usan `useServerPaged`, cuyo estado es **por instancia de pantalla**: no es
 * estado compartido y por eso no vive en un store.
 */
const { subscription } = useSuscripcion()
const {
  creditBalance,
  creditForbidden,
  tieneSaldoAFavor,
  dunningEvents,
  dunningForbidden,
  dunningLoaded,
  loadCreditBalance,
  loadDunning,
} = useCobros()

const avisosAbiertos = ref(false)

const documentos = useServerPaged<BillingDocumentResponse>((page, pageSize) =>
  cobrosApi.listAll(page, pageSize),
)

const pagos = useServerPaged<SubscriptionPaymentResponse>((page, pageSize) =>
  cobrosApi.listPayments(page, pageSize),
)

/** La cuenta vencida va PRIMERA: es lo que hay que ver sin buscar. */
const filas = computed(() =>
  [...documentos.items.value].sort((a, b) => Number(estaVencida(b)) - Number(estaVencida(a))),
)

const saldo = computed(() =>
  creditBalance.value
    ? saldoAFavorTexto(creditBalance.value.balanceAmount, creditBalance.value.nextExpiryOn)
    : null,
)

onMounted(() => {
  void documentos.reload()
  void pagos.reload()
  void loadCreditBalance()
})

function abrirAvisos() {
  avisosAbiertos.value = !avisosAbiertos.value
  const id = subscription.value?.id
  if (avisosAbiertos.value && !dunningLoaded.value && id != null) void loadDunning(id)
}

const tabla = useTemplateRef<HTMLElement>('tabla')
const desborda = useScrollableRegion(tabla)
</script>

<template>
  <div>
    <PageHeader kicker="Mi suscripción" title="Mis cuentas de cobro" />

    <!-- Información PRESENTE AL CARGAR: sin `role` y sin `aria-live`. Una región viva sobre
         contenido inicial o se anuncia dos veces o no se anuncia ninguna, según el lector. -->
    <p class="ds-banner ds-banner--info">{{ CABECERA_SOLO_LECTURA }}</p>

    <div class="ds-stack ds-stack--18">
      <!-- Sin `customerCredit.read` la tarjeta no se pinta y el resto sí. -->
      <SectionCard v-if="tieneSaldoAFavor && saldo && !creditForbidden" title="Saldo a favor">
        <p :class="saldo.tono === 'warning' ? 'ds-banner ds-banner--warning' : 'ds-meta'">
          {{ saldo.texto }}
        </p>
      </SectionCard>

      <SectionCard :title="MONEY_LABELS.facturado" :icon="Receipt">
        <!-- La rama de error va ANTES que la de vacío (EST-01): un 500 no es «no hay nada». -->
        <div v-if="documentos.error.value" class="ds-banner ds-banner--error" role="alert">
          <span class="ds-flex-fill">
            {{ documentos.error.value }}
            <span v-if="documentos.errorTraceId.value" class="ds-meta">
              {{ documentos.errorTraceId.value }}
            </span>
          </span>
          <button
            type="button"
            class="ds-btn ds-btn--neutral ds-btn--snug"
            @click="documentos.reload()"
          >
            Reintentar
          </button>
        </div>
        <p v-else-if="documentos.isEmpty.value" class="ds-empty ds-empty--tight">
          {{ SIN_DOCUMENTOS }}
        </p>
        <div
          v-else
          ref="tabla"
          class="ds-table-scroll ds-focus-ring"
          role="region"
          aria-label="Facturas de la suscripción"
          :tabindex="desborda ? 0 : undefined"
        >
          <table class="ds-table">
            <thead>
              <tr>
                <th scope="col">Factura</th>
                <th scope="col">Periodo</th>
                <th scope="col">Vence</th>
                <th scope="col" class="ds-num">Total</th>
                <th scope="col" class="ds-num">Pendiente</th>
                <th scope="col">Estado</th>
              </tr>
            </thead>
            <tbody>
              <DocumentoCobroFila v-for="doc in filas" :key="doc.id" :documento="doc" />
            </tbody>
          </table>
        </div>
        <Pagination
          :page="documentos.page.value"
          :page-count="documentos.pageCount.value"
          :total="documentos.total.value"
          :page-size="documentos.pageSize"
          @update:page="documentos.goTo($event)"
        />
      </SectionCard>

      <SectionCard :title="MONEY_LABELS.cobrado" :icon="Wallet">
        <div v-if="pagos.error.value" class="ds-banner ds-banner--error" role="alert">
          <span class="ds-flex-fill">{{ pagos.error.value }}</span>
          <button type="button" class="ds-btn ds-btn--neutral ds-btn--snug" @click="pagos.reload()">
            Reintentar
          </button>
        </div>
        <p v-else-if="pagos.isEmpty.value" class="ds-empty ds-empty--tight">
          Todavía no hay pagos registrados.
        </p>
        <ul v-else class="ds-list-reset ds-stack ds-stack--8">
          <li v-for="p in pagos.items.value" :key="p.id" class="ds-flex-row ds-flex-row--12">
            <span class="ds-flex-fill">{{ formatDateShort(p.receivedAt) }}</span>
            <span class="ds-meta">{{ paymentMethodLabel(p.paymentMethod) }}</span>
            <span class="ds-num">{{ formatMoney(p.amount) }}</span>
            <span class="ds-pill ds-tone--neutral">{{ paymentStatusLabel(p.status) }}</span>
          </li>
        </ul>
      </SectionCard>

      <details :open="avisosAbiertos">
        <summary class="ds-hint" @click.prevent="abrirAvisos">
          Avisos de cobro que te enviamos
        </summary>
        <p v-if="dunningForbidden" class="ds-meta">
          Tu rol no incluye ver estos avisos. Pídeselo a quien administre los permisos de tu
          clínica.
        </p>
        <ul v-else-if="dunningEvents.length > 0" class="ds-list-reset ds-stack ds-stack--8">
          <li v-for="ev in dunningEvents" :key="ev.id" class="ds-flex-row ds-flex-row--12">
            <span class="ds-flex-fill">{{ dunningLabel(ev.eventType) }}</span>
            <span v-if="ev.daysOverdue != null" class="ds-meta">
              {{ ev.daysOverdue }} días de retraso
            </span>
            <span class="ds-meta">{{ formatDateShort(ev.occurredAt) }}</span>
          </li>
        </ul>
        <p v-else-if="dunningLoaded" class="ds-meta">No te hemos enviado ningún aviso de cobro.</p>
      </details>
    </div>
  </div>
</template>

<style scoped>
summary {
  cursor: pointer;
  margin-bottom: var(--space-8);
}
</style>
