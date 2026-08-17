<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { User, Check } from 'lucide-vue-next'
import ModalShell from '@/components/ui/ModalShell.vue'
import BaseField from '@/components/ui/BaseField.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import { calcVerificationDigit } from '../composables/feFormat'
import {
  OWNER_DOCTYPE_LABEL,
  type FiscalCustomer,
  type OwnerDocumentType,
} from '../composables/feFiscalChecklist'
import { TAX_REGIME_LABEL, type PersonType, type TaxRegime } from '../types/facturacion'
import { scrollToFirstError } from '@/composables/scrollToError'

const props = defineProps<{ open: boolean; customer: FiscalCustomer | null }>()
const emit = defineEmits<{ save: [data: Partial<FiscalCustomer>]; close: [] }>()

const draft = reactive({
  documentType: 'CEDULA_CIUDADANIA' as OwnerDocumentType,
  documentId: '',
  personType: 'NATURAL' as PersonType,
  legalName: '',
  email: '',
  taxRegime: 'NO_RESPONSABLE_IVA' as TaxRegime,
  withholdingAgent: false,
})
const submitted = ref(false)

watch(
  () => props.open,
  (open) => {
    if (!open) return
    submitted.value = false
    const c = props.customer
    draft.documentType = c?.documentType ?? 'CEDULA_CIUDADANIA'
    draft.documentId = c?.documentId ?? ''
    draft.personType = c?.personType ?? 'NATURAL'
    draft.legalName = c?.legalName ?? c?.name ?? ''
    draft.email = c?.email ?? ''
    draft.taxRegime = c?.taxRegime ?? 'NO_RESPONSABLE_IVA'
    draft.withholdingAgent = c?.withholdingAgent ?? false
  },
)

const docTypeOptions = (Object.keys(OWNER_DOCTYPE_LABEL) as OwnerDocumentType[]).map((k) => ({
  value: k,
  label: OWNER_DOCTYPE_LABEL[k],
}))
const regimeOptions = (Object.keys(TAX_REGIME_LABEL) as TaxRegime[]).map((k) => ({
  value: k,
  label: TAX_REGIME_LABEL[k],
}))

const isNit = computed(() => draft.documentType === 'NIT')
const isJuridica = computed(() => draft.personType === 'JURIDICA')
const dv = computed(() => (isNit.value ? calcVerificationDigit(draft.documentId) : ''))
const emailValid = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(draft.email))

const errors = computed(() => ({
  documentId: draft.documentId.trim() ? null : 'Requerido',
  legalName: isJuridica.value && !draft.legalName.trim() ? 'Requerido para persona jurídica' : null,
  // Backend (UpdateOwnerRequest): email es @Email (solo formato) sin @NotBlank y la columna es nullable →
  // opcional. El email del adquiriente en la FE es un snapshot best-effort (nullable, el proveedor tolera null).
  email: draft.email.trim() && !emailValid.value ? 'Correo inválido' : null,
}))
const isValid = computed(() => Object.values(errors.value).every((e) => !e))

type ErrKey = 'documentId' | 'legalName' | 'email'
function err(field: ErrKey): string | undefined {
  return submitted.value ? (errors.value[field] ?? undefined) : undefined
}

function save() {
  submitted.value = true
  if (!isValid.value) {
    scrollToFirstError()
    return
  }
  emit('save', {
    documentType: draft.documentType,
    documentId: draft.documentId.trim(),
    verificationDigit: isNit.value ? dv.value : null,
    personType: draft.personType,
    legalName: isJuridica.value ? draft.legalName.trim() : null,
    email: draft.email.trim(),
    taxRegime: draft.taxRegime,
    withholdingAgent: draft.withholdingAgent,
  })
}
</script>

<template>
  <ModalShell
    :open="open"
    :title="`Datos fiscales de ${customer?.name || 'cliente'}`"
    subtitle="Necesarios para emitir la factura electrónica ante la DIAN"
    :icon="User"
    accent="amatista"
    :width="560"
    @close="emit('close')"
  >
    <template #body>
      <div class="grid">
        <BaseField label="Tipo de documento" required>
          <template #default="{ id }">
            <BaseSelect :id="id" v-model="draft.documentType" :options="docTypeOptions" />
          </template>
        </BaseField>
        <div class="doc-row" :class="{ nit: isNit }">
          <BaseField label="Número de documento" required :error="err('documentId')">
            <template #default="{ id }">
              <BaseInput
                :id="id"
                v-model="draft.documentId"
                inputmode="numeric"
                :invalid="!!err('documentId')"
                @update:model-value="draft.documentId = String($event).replace(/\D/g, '')"
              />
            </template>
          </BaseField>
          <div v-if="isNit" class="dv">
            <div class="dv-lbl">DV</div>
            <div class="dv-val">{{ dv || '–' }}</div>
          </div>
        </div>
      </div>

      <div class="field">
        <div class="field-lab ds-text-strong">Tipo de persona <span class="req">*</span></div>
        <div class="segmented">
          <button
            type="button"
            class="seg"
            :class="{ on: draft.personType === 'NATURAL' }"
            @click="draft.personType = 'NATURAL'"
          >
            Natural
          </button>
          <button
            type="button"
            class="seg"
            :class="{ on: draft.personType === 'JURIDICA' }"
            @click="draft.personType = 'JURIDICA'"
          >
            Jurídica
          </button>
        </div>
      </div>

      <BaseField v-if="isJuridica" label="Razón social" required :error="err('legalName')">
        <template #default="{ id }">
          <BaseInput :id="id" v-model="draft.legalName" :invalid="!!err('legalName')" />
        </template>
      </BaseField>

      <BaseField
        label="Correo electrónico"
        :error="err('email')"
        hint="Se enviará la representación gráfica de la factura."
      >
        <template #default="{ id }">
          <BaseInput
            :id="id"
            v-model="draft.email"
            type="email"
            inputmode="email"
            :invalid="!!err('email')"
          />
        </template>
      </BaseField>

      <div v-if="customer?.cityName" class="city-info ds-flex-row ds-flex-row--12">
        <span class="city-lab">Ciudad</span>
        <span class="ds-strong">{{ customer.cityName }}</span>
      </div>

      <BaseField label="Régimen tributario" required>
        <template #default="{ id }">
          <BaseSelect :id="id" v-model="draft.taxRegime" :options="regimeOptions" />
        </template>
      </BaseField>

      <button
        type="button"
        class="agenttoggle"
        :class="{ on: draft.withholdingAgent }"
        @click="draft.withholdingAgent = !draft.withholdingAgent"
      >
        <span class="agentbox">
          <Check v-if="draft.withholdingAgent" :size="12" :stroke-width="2.6" />
        </span>
        <span>
          <strong>Agente retenedor</strong>
          <span class="ds-hint">Si está activo se aplicarán retenciones (ReteFuente/IVA/ICA).</span>
        </span>
      </button>
    </template>

    <template #footer-actions>
      <button type="button" class="ds-btn ds-btn--ghost" @click="emit('close')">Cancelar</button>
      <button type="button" class="ds-btn ds-btn--primary ds-btn--strong" @click="save">
        Guardar y continuar
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
/* Layout desde primitives.css: .ds-flex-row--12 (fila de ciudad),
   .ds-strong, .ds-hint y .ds-text-strong (tipografía). */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 18px 22px;
}

.doc-row.nit {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  align-items: start;
}

.dv {
  text-align: center;
  padding-bottom: 2px;
}

.dv-lbl {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--warm-400);
}

.dv-val {
  width: 44px;
  height: 40px;
  border-radius: 8px;
  background: var(--warm-150, var(--warm-100));
  border: 1px solid var(--warm-200);
  display: grid;
  place-items: center;
  font-size: 17px;
  font-weight: 700;
  color: var(--amatista-700);
  font-variant-numeric: tabular-nums;
  margin-top: 3px;
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

.field,
.city-info {
  margin-top: 16px;
}

.city-info {
  justify-content: space-between;
  padding: 10px 14px;
  border-radius: 10px;
  background: var(--warm-100);
  font-size: 12.5px;
}

.city-lab {
  color: var(--warm-500);
}

.agenttoggle {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-top: 16px;
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

.agentbox {
  width: 18px;
  height: 18px;
  border-radius: 5px;
  border: 1.5px solid var(--warm-300);
  display: grid;
  place-items: center;
  flex-shrink: 0;
  margin-top: 1px;
  color: white;
}

.agenttoggle.on .agentbox {
  background: var(--amatista-600);
  border-color: var(--amatista-600);
}

.agenttoggle strong {
  font-size: 13px;
  color: var(--warm-900);
  display: block;
}
</style>
