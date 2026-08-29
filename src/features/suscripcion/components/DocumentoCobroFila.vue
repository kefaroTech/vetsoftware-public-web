<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { formatDateShort } from '@/composables/format'
import { formatMoney } from '@/composables/money'
import { estadoDocumento, referenciaDocumento } from '../composables/cobrosText'
import type { BillingDocumentResponse } from '../types/cobros.types'

/**
 * Una fila de la tabla de cuentas de cobro.
 *
 * <p>La columna de identificación es `externalInvoiceNumber` —la factura fiscal del cliente— y
 * **nunca** `documentNumber`, que es el `DC-…` interno de plataforma.
 *
 * <p>El estado va en **texto**, no solo en color de fila: un color no se puede leer por
 * teléfono ni sobrevive a una impresión en blanco y negro.
 */
const props = defineProps<{ documento: BillingDocumentResponse }>()

const estado = computed(() => estadoDocumento(props.documento))

const periodo = computed(() => {
  const d = props.documento
  if (!d.periodStart && !d.periodEnd) return '—'
  return `${formatDateShort(d.periodStart)} – ${formatDateShort(d.periodEnd)}`
})

const claseEstado = computed(() => {
  if (estado.value.tono === 'error') return 'ds-tone--danger'
  if (estado.value.tono === 'warning') return 'ds-tone--warning'
  return 'ds-tone--neutral'
})
</script>

<template>
  <tr>
    <td>
      <RouterLink
        :to="{ name: 'suscripcion-cobro', params: { id: documento.id } }"
        class="referencia"
      >
        {{ referenciaDocumento(documento) }}
      </RouterLink>
    </td>
    <td>{{ periodo }}</td>
    <td>{{ formatDateShort(documento.dueDate) }}</td>
    <td class="ds-num">{{ formatMoney(documento.totalAmount ?? 0) }}</td>
    <td class="ds-num">{{ formatMoney(documento.balanceAmount ?? 0) }}</td>
    <td>
      <span class="ds-pill" :class="claseEstado">{{ estado.texto }}</span>
    </td>
  </tr>
</template>

<style scoped>
.referencia {
  color: var(--amatista-700);
  font-weight: var(--weight-medium);
}
</style>
