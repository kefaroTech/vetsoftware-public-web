<script setup lang="ts">
import { computed } from 'vue'
import { Check } from 'lucide-vue-next'
import BaseField from '@/components/ui/BaseField.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import { OWNER_DOCTYPE_LABEL, type OwnerDocumentType } from '../composables/feFiscalChecklist'
import { TAX_REGIME_LABEL, type PersonType, type TaxRegime } from '../types/facturacion'

/**
 * Bloque "Datos fiscales" del alta de cliente: tipo de documento, tipo de
 * persona, régimen tributario y agente retenedor.
 *
 * Sale de `FeCustomerCreateForm` con sus 16 reglas de CSS. `required` refleja el
 * modo del picker: en `fiscal` (FE por encima de 5 UVT) los campos se marcan
 * obligatorios y la caja cambia de tono; en `basic` son opcionales.
 */
defineProps<{ required: boolean }>()

const documentType = defineModel<OwnerDocumentType>('documentType', { required: true })
const personType = defineModel<PersonType>('personType', { required: true })
const taxRegime = defineModel<TaxRegime>('taxRegime', { required: true })
const withholdingAgent = defineModel<boolean>('withholdingAgent', { required: true })

const isJuridica = computed(() => personType.value === 'JURIDICA')

const docTypeOptions = (Object.keys(OWNER_DOCTYPE_LABEL) as OwnerDocumentType[]).map((k) => ({
  value: k,
  label: OWNER_DOCTYPE_LABEL[k],
}))
const regimeOptions = (Object.keys(TAX_REGIME_LABEL) as TaxRegime[]).map((k) => ({
  value: k,
  label: TAX_REGIME_LABEL[k],
}))
</script>

<template>
  <div class="sectlabel ds-flex-row">
    Datos fiscales
    <span v-if="required" class="reqtag">requeridos para factura electrónica</span>
    <span v-else class="opttag">opcionales</span>
  </div>
  <div class="fiscalbox" :class="{ req: required }">
    <div class="grid ds-grid-2">
      <BaseField label="Tipo de documento" :required="required">
        <template #default="{ id }">
          <BaseSelect :id="id" v-model="documentType" :options="docTypeOptions" />
        </template>
      </BaseField>
      <div class="ds-stack">
        <div class="field-lab ds-text-strong">
          Tipo de persona <span v-if="required" class="req">*</span>
        </div>
        <div class="segmented">
          <button
            type="button"
            class="seg"
            :class="{ on: personType === 'NATURAL' }"
            @click="personType = 'NATURAL'"
          >
            Natural
          </button>
          <button
            type="button"
            class="seg"
            :class="{ on: personType === 'JURIDICA' }"
            @click="personType = 'JURIDICA'"
          >
            Jurídica
          </button>
        </div>
      </div>
      <BaseField label="Régimen tributario" :required="required">
        <template #default="{ id }">
          <BaseSelect :id="id" v-model="taxRegime" :options="regimeOptions" />
        </template>
      </BaseField>
    </div>
    <p v-if="isJuridica" class="juridica-hint ds-meta">
      El <strong>Nombre</strong> se usará como razón social de la empresa.
    </p>
    <button
      type="button"
      class="agenttoggle"
      :class="{ on: withholdingAgent }"
      @click="withholdingAgent = !withholdingAgent"
    >
      <span class="agentbox" :class="withholdingAgent ? 'ds-tone--accent-solid' : 'agentbox-off'">
        <Check v-if="withholdingAgent" :size="12" :stroke-width="2.6" />
      </span>
      <span>
        <strong>Agente retenedor</strong>
        <span class="ds-hint">Si está activo se aplicarán retenciones.</span>
      </span>
    </button>
  </div>
</template>

<style scoped>
/* Layout via primitivas: .ds-grid-2, .ds-stack, .ds-flex-row, .ds-hint, .ds-meta
   y .ds-text-strong. */
.sectlabel {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: var(--warm-600);
  margin: 16px 0 10px;
}
.reqtag {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0;
  text-transform: none;
  padding: 2px 8px;
  border-radius: var(--radius-pill);
  background: var(--warning-50);
  color: oklch(45% 0.11 70deg);
}
.opttag {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0;
  text-transform: none;
  padding: 2px 8px;
  border-radius: var(--radius-pill);
  background: var(--warm-150, var(--warm-100));
  color: var(--warm-500);
}

/* El gap propio del formulario; las columnas y su colapso los pone .ds-grid-2. */
.grid {
  gap: var(--space-16) var(--space-20);
}

.fiscalbox {
  padding: 14px;
  border-radius: 12px;
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
}
.fiscalbox.req {
  background: oklch(98.5% 0.01 80deg);
  border-color: oklch(90% 0.05 80deg);
}
.juridica-hint {
  margin: 12px 0 0;
}
.field-lab {
  font-size: 12px;
  margin-bottom: 6px;
}
.req {
  color: var(--danger-500);
}
.segmented {
  display: inline-flex;
  gap: 4px;
  padding: 3px;
  background: var(--warm-150, var(--warm-100));
  border-radius: 9px;
}
.seg {
  padding: 7px 16px;
  border-radius: 7px;
  border: none;
  background: none;
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  color: var(--warm-600);
  cursor: pointer;
}
.seg.on {
  background: var(--warm-50);
  color: var(--amatista-700);
  font-weight: 600;
  box-shadow: 0 1px 2px rgb(20 15 30 / 8%);
}

.agenttoggle {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-top: 12px;
  padding: 12px 14px;
  border-radius: 11px;
  background: var(--warm-50);
  border: 1.5px solid var(--warm-200);
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  width: 100%;
}
.agenttoggle.on {
  background: var(--amatista-50);
  border-color: var(--amatista-400);
}

/* El tono de la casilla llega desde el template (`.ds-tone--accent-solid` cuando
   está activa, `.agentbox-off` en reposo). Fijar aquí `background`/`border-color`
   pesaría (0,2,0) por el `[data-v-…]` del scope y ganaría a la primitiva. */
.agentbox {
  width: 18px;
  height: 18px;
  border-radius: 5px;
  border-width: 1.5px;
  border-style: solid;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  margin-top: 1px;
  color: white;
}
.agentbox-off {
  border-color: var(--warm-300);
}
.agenttoggle strong {
  font-size: 13px;
  color: var(--warm-900);
  display: block;
}
</style>
