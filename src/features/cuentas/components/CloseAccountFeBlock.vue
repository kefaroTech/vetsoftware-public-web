<script setup lang="ts">
import { Check, FileText, ShieldCheck, User, X } from 'lucide-vue-next'
import BaseField from '@/components/ui/BaseField.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import FeThresholdBanner from '@/features/facturacion/components/FeThresholdBanner.vue'
import FeFiscalCustomerCard from '@/features/facturacion/components/FeFiscalCustomerCard.vue'
import { CLOSE_DOC_TYPE_OPTIONS, type FeDocType } from '../composables/useCloseAccount'
import type { FiscalCustomer } from '@/features/facturacion/composables/feFiscalChecklist'

/**
 * Bloque de facturación electrónica del cierre de cuenta, en sus dos formas.
 *
 * Por encima de 5 UVT la factura electrónica es obligatoria: no hay selector,
 * se muestra el documento POS bloqueado y hacen falta los datos fiscales del
 * titular. Por debajo, el usuario elige tipo de documento y consumidor final.
 */
defineProps<{
  overUvt: boolean
  totalAmount: number
  customer: FiscalCustomer | null
  loading: boolean
  loadError: boolean
}>()

const emit = defineEmits<{ completeCustomer: []; retryLoad: [] }>()

const docType = defineModel<FeDocType>('docType', { required: true })
const finalConsumer = defineModel<boolean>('finalConsumer', { required: true })
</script>

<template>
  <!-- FE OBLIGATORIA por superar 5 UVT -->
  <div v-if="overUvt" class="fe-block uvt ds-stack ds-stack--10">
    <FeThresholdBanner :total="totalAmount" />
    <div class="doctypesel">
      <div class="doctype on"><FileText :size="15" :stroke-width="1.8" /> Factura electrónica</div>
      <div class="doctype off" title="No disponible por encima de 5 UVT">
        <ShieldCheck :size="14" :stroke-width="1.8" style="opacity: 0.5" /> Documento POS
        <span class="lock"><X :size="11" :stroke-width="2.4" /></span>
      </div>
    </div>
    <FeFiscalCustomerCard :customer="customer" @complete="emit('completeCustomer')" />
    <p v-if="loading" class="fe-loading ds-meta ds-meta--sm">
      Cargando datos fiscales del cliente…
    </p>
    <div v-else-if="loadError" class="fe-loaderr">
      <span>No se pudieron cargar los datos fiscales del titular.</span>
      <button type="button" @click="emit('retryLoad')">Reintentar</button>
    </div>
    <p v-else class="fe-preloadhint">
      <User :size="12" :stroke-width="1.9" />
      La factura electrónica se emite a nombre del titular de la cuenta.
    </p>
  </div>

  <!-- Caso normal (≤ 5 UVT): tipo de documento + consumidor final -->
  <div v-else class="fe-block ds-stack ds-stack--10">
    <div class="field-lab">Facturación electrónica</div>
    <BaseField label="Tipo de documento">
      <template #default="{ id }">
        <BaseSelect :id="id" v-model="docType" :options="CLOSE_DOC_TYPE_OPTIONS" />
      </template>
    </BaseField>
    <button
      type="button"
      class="fc-toggle"
      :class="{ on: finalConsumer }"
      @click="finalConsumer = !finalConsumer"
    >
      <span class="fc-box"><Check v-if="finalConsumer" :size="12" :stroke-width="2.6" /></span>
      Consumidor final
    </button>
    <p class="fe-hint ds-hint">
      Se emite a la DIAN al cerrar la venta. La validación es asíncrona.
    </p>
  </div>
</template>

<style scoped>
/* Layout via primitivas: .ds-stack(--10), .ds-hint, .ds-meta(--sm). */
.field-lab {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--warm-700);
  margin-bottom: -6px;
}
.fe-block {
  padding: 14px;
  border-radius: 12px;
  background: var(--amatista-50);
  border: 1px solid var(--amatista-100);
}
.fe-block.uvt {
  background: transparent;
  border: none;
  padding: 0;
  gap: 12px;
}
.fc-toggle {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  align-self: flex-start;
  font-family: inherit;
  font-size: 13px;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 9px;
  background: white;
  border: 1px solid var(--warm-200);
  color: var(--warm-800);
}
.fc-toggle.on {
  border-color: var(--amatista-500);
  color: var(--amatista-700);
}
.fc-box {
  width: 18px;
  height: 18px;
  border-radius: 5px;
  display: grid;
  place-items: center;
  border: 1px solid var(--warm-300);
  background: white;
  color: white;
}
.fc-toggle.on .fc-box {
  background: var(--amatista-600);
  border-color: var(--amatista-600);
}
.fe-hint {
  margin: 0;
}
.doctypesel {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.doctype {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 11px 13px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  position: relative;
}
.doctype.on {
  background: var(--amatista-50);
  border: 1.5px solid var(--amatista-400);
  color: var(--amatista-700);
}
.doctype.off {
  background: var(--warm-100);
  border: 1.5px solid var(--warm-200);
  color: var(--warm-400);
  cursor: not-allowed;
}
.lock {
  margin-left: auto;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--warm-200);
  color: var(--warm-500);
  display: grid;
  place-items: center;
}
.fe-loading {
  padding: 12px 14px;
  border-radius: 11px;
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
}
.fe-preloadhint {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  color: var(--warm-500);
}
.fe-preloadhint svg {
  flex-shrink: 0;
  color: var(--warm-400);
}
.fe-loaderr {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 9px 12px;
  border-radius: 10px;
  font-size: 12px;
  background: oklch(96% 0.05 25deg);
  border: 1px solid oklch(89% 0.07 25deg);
  color: oklch(46% 0.16 25deg);
}
.fe-loaderr button {
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 7px;
  border: 1px solid currentcolor;
  background: transparent;
  color: inherit;
  cursor: pointer;
  flex-shrink: 0;
}
</style>
