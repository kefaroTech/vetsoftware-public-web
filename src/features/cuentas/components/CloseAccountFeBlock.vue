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
  <!--
    Un solo contenedor para las dos formas, en vez de dos `div` excluyentes: el
    aviso de umbral tiene que sobrevivir al cambio de rama. `FeThresholdBanner`
    sostiene la región viva de una obligación legal y, si naciera con el `v-if`,
    quien no mire esa zona de la pantalla no se entera de que la venta pasó de
    Documento POS a Factura electrónica (`docs/ux/patron-de-mensajes.md` §4.2c).
    Las clases de cada estado son las mismas de antes, así que el aspecto no se
    mueve.
  -->
  <div class="fe-block ds-stack ds-stack--10" :class="{ uvt: overUvt }">
    <FeThresholdBanner :total="totalAmount" />

    <!-- FE OBLIGATORIA por superar 5 UVT -->
    <template v-if="overUvt">
      <div class="doctypesel">
        <div class="doctype on">
          <FileText :size="15" :stroke-width="1.8" /> Factura electrónica
        </div>
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
    </template>

    <!-- Caso normal (≤ 5 UVT): tipo de documento + consumidor final -->
    <template v-else>
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
        <span class="fc-box" :class="finalConsumer ? 'ds-tone--accent-solid' : 'fc-box-off'"
          ><Check v-if="finalConsumer" :size="12" :stroke-width="2.6"
        /></span>
        Consumidor final
      </button>
      <p class="fe-hint ds-hint">
        Se emite a la DIAN al cerrar la venta. La validación es asíncrona.
      </p>
    </template>
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
  border: 1px solid var(--warm-450);
  color: var(--warm-800);
}
.fc-toggle.on {
  border-color: var(--amatista-500);
  color: var(--amatista-700);
}

/* El tono de la casilla lo pone `.ds-tone--accent-solid` (marcada) o
   `.fc-box-off` (en reposo) desde el template: si el fondo y el color de borde
   vivieran en esta regla pesarían (0,2,0) con el `[data-v-…]` del scope y le
   ganarían a la primitiva (0,1,0). */
.fc-box {
  width: 18px;
  height: 18px;
  border-radius: 5px;
  display: grid;
  place-items: center;
  border-width: 1px;
  border-style: solid;
  color: white;
}
.fc-box-off {
  background: white;
  border-color: var(--warm-300);
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

/* A11Y-09 · el tipo de documento ELEGIDO se marcaba con `--amatista-400`:
   2,74:1 sobre su propio relleno, por debajo del mínimo. `--amatista-500` da
   4,17:1. (`.doctype.off` conserva `--warm-200`: es `cursor: not-allowed`, y
   §1.4.11 exime a los componentes inactivos.) */
.doctype.on {
  background: var(--amatista-50);
  border: 1.5px solid var(--amatista-500);
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
