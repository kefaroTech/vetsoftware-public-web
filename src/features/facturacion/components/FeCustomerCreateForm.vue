<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { ArrowLeft, X } from 'lucide-vue-next'
import BaseField from '@/components/ui/BaseField.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import FeCustomerFiscalFields from './FeCustomerFiscalFields.vue'
import { useToast } from '@/composables/useToast'
import { getProblemDetailMessage } from '@/services/http/http.client'
import { useGeoCascade } from '@/features/dashboard/views/consulta/nueva/composables/useGeoCascade'
import { ownerApi } from '@/features/dashboard/views/consulta/nueva/api/owner.api'
import type {
  OwnerResponse,
  CreateOwnerRequest,
} from '@/features/dashboard/views/consulta/nueva/types/owner.types'
import { calcVerificationDigit } from '../composables/feFormat'
import type { OwnerDocumentType } from '../composables/feFiscalChecklist'
import type { PersonType, TaxRegime } from '../types/facturacion'
// Un solo sanitizador de teléfono para todo el tenant: ver `composables/phone.ts`.
import { sanitizePhone, PHONE_PLACEHOLDER_MOBILE } from '@/composables/phone'

/**
 * Alta de cliente in-situ: la rama `create` que vivía dentro de
 * `FeCustomerPicker`, que era literalmente dos pantallas en un fichero.
 *
 * La API pública del picker (prop `mode`, evento `pick`) no cambia: este
 * componente emite el mismo `pick` con el propietario ya creado, y el padre lo
 * reenvía tal cual a `POSView` / `OpenAccountModal`.
 */
// mode: 'basic'  → POS ≤ 5 UVT, datos fiscales opcionales.
//       'fiscal' → FE > 5 UVT, datos fiscales requeridos.
const props = defineProps<{ mode: 'basic' | 'fiscal' }>()
const emit = defineEmits<{ pick: [owner: OwnerResponse]; back: [] }>()

const fiscal = computed(() => props.mode === 'fiscal')
const toast = useToast()

const draft = reactive({
  name: '',
  documentId: '',
  phone: '',
  email: '',
  address: '',
  countryId: '',
  stateId: '',
  cityId: '',
  documentType: 'CEDULA_CIUDADANIA' as OwnerDocumentType,
  personType: 'NATURAL' as PersonType,
  taxRegime: 'NO_RESPONSABLE_IVA' as TaxRegime,
  withholdingAgent: false,
})

const countryRef = computed({ get: () => draft.countryId, set: (v) => (draft.countryId = v) })
const stateRef = computed({ get: () => draft.stateId, set: (v) => (draft.stateId = v) })
const {
  countryOptions,
  stateOptions,
  cityOptions,
  loadingStates,
  loadingCities,
  error: geoError,
} = useGeoCascade(countryRef, stateRef)

watch(
  () => draft.countryId,
  () => {
    draft.stateId = ''
    draft.cityId = ''
  },
)
watch(
  () => draft.stateId,
  () => {
    draft.cityId = ''
  },
)

const isNit = computed(() => draft.documentType === 'NIT')
const isJuridica = computed(() => draft.personType === 'JURIDICA')
const dv = computed(() => (isNit.value ? calcVerificationDigit(draft.documentId) : ''))
const emailValid = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(draft.email))
// Teléfono: opcional (backend nullable), pero si se ingresa debe respetar el formato
// convencional (solo [+\d\s\-()], entre 7 y 15 dígitos). Se sanitiza en vivo.
const phoneDigits = (v: string) => (v.match(/\d/g) ?? []).length
const phoneValid = computed(() => {
  const v = draft.phone.trim()
  return /^[+\d\s\-()]+$/.test(v) && phoneDigits(v) >= 7 && phoneDigits(v) <= 15
})
const phoneModel = computed({
  get: () => draft.phone,
  set: (v: string) => (draft.phone = sanitizePhone(v)),
})

type FieldKey = 'name' | 'documentId' | 'phone' | 'email' | 'cityId' | 'legalName'
const touched = reactive<Record<FieldKey, boolean>>({
  name: false,
  documentId: false,
  phone: false,
  email: false,
  cityId: false,
  legalName: false,
})
const submitting = ref(false)
const submitError = ref<string | null>(null)

const errors = computed<Record<FieldKey, string | null>>(() => ({
  name: draft.name.trim() ? null : 'Requerido',
  documentId: draft.documentId.trim() ? null : 'Requerido',
  // Backend (CreateOwnerRequest): phone es @Size(max=30) sin @NotBlank y la columna es nullable → opcional.
  // Si el usuario lo ingresa, validamos el formato (solo [+\d\s\-()], 7–15 dígitos).
  phone: draft.phone.trim() && !phoneValid.value ? 'Teléfono inválido (7 a 15 dígitos)' : null,
  // Backend: email es @Email (solo formato) sin @NotBlank y la columna es nullable → opcional en ambos modos.
  // El email del adquiriente en la FE es un snapshot best-effort (columna nullable, el proveedor tolera null).
  email: draft.email.trim() && !emailValid.value ? 'Correo inválido' : null,
  cityId: draft.cityId ? null : 'Requerida',
  legalName: fiscal.value && isJuridica.value && !draft.name.trim() ? 'Requerido' : null,
}))
const isValid = computed(() => Object.values(errors.value).every((e) => !e))

function err(field: FieldKey): string | undefined {
  return touched[field] ? (errors.value[field] ?? undefined) : undefined
}
function markTouched(field: FieldKey) {
  touched[field] = true
}

async function submit() {
  ;(Object.keys(touched) as FieldKey[]).forEach((k) => (touched[k] = true))
  if (!isValid.value || submitting.value) return
  submitting.value = true
  submitError.value = null
  const payload: CreateOwnerRequest = {
    name: draft.name.trim(),
    document: draft.documentId.trim(),
    phone: draft.phone.trim(),
    email: draft.email.trim(),
    address: draft.address.trim(),
    cityId: Number(draft.cityId),
    documentType: draft.documentType,
    personType: draft.personType,
    verificationDigit: isNit.value ? dv.value : null,
    legalName: isJuridica.value ? draft.name.trim() : null,
    withholdingAgent: draft.withholdingAgent,
    taxRegime: draft.taxRegime,
  }
  try {
    const created = await ownerApi.create(payload)
    toast.success('Cliente creado', `${created.name} quedó registrado y seleccionado.`)
    emit('pick', created)
  } catch (e) {
    submitError.value = getProblemDetailMessage(
      e,
      'No se pudo crear el cliente. Revisa los datos e inténtalo de nuevo.',
    )
    toast.error('No se pudo crear el cliente', submitError.value)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="cpk-create ds-stack">
    <button type="button" class="back" @click="emit('back')">
      <ArrowLeft :size="14" :stroke-width="1.9" /> Volver a la búsqueda
    </button>

    <div v-if="submitError" class="failbanner ds-flex-row">
      <X :size="14" :stroke-width="2.2" /> {{ submitError }}
    </div>
    <div v-if="geoError" class="failbanner ds-flex-row">
      <X :size="14" :stroke-width="2.2" /> {{ geoError }}
    </div>

    <div class="sectlabel ds-flex-row">Datos básicos</div>
    <div class="grid ds-grid-2">
      <BaseField label="Nombre" required :error="err('name')">
        <template #default="{ id }">
          <BaseInput
            :id="id"
            v-model="draft.name"
            placeholder="Nombre y apellido o razón social"
            :invalid="!!err('name')"
            @blur="markTouched('name')"
          />
        </template>
      </BaseField>
      <BaseField label="Teléfono" :error="err('phone')">
        <template #default="{ id }">
          <BaseInput
            :id="id"
            v-model="phoneModel"
            :placeholder="PHONE_PLACEHOLDER_MOBILE"
            inputmode="tel"
            :invalid="!!err('phone')"
            @blur="markTouched('phone')"
          />
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
              @blur="markTouched('documentId')"
            />
          </template>
        </BaseField>
        <div v-if="isNit" class="dv">
          <div class="dv-lbl">DV</div>
          <div class="dv-val">{{ dv || '–' }}</div>
        </div>
      </div>

      <BaseField :label="fiscal ? 'Correo electrónico' : 'Correo (opcional)'" :error="err('email')">
        <template #default="{ id }">
          <BaseInput
            :id="id"
            v-model="draft.email"
            type="email"
            inputmode="email"
            :invalid="!!err('email')"
            @blur="markTouched('email')"
          />
        </template>
      </BaseField>

      <div class="ds-grid-span geo">
        <BaseField label="País" required>
          <template #default="{ id }">
            <BaseSelect
              :id="id"
              v-model="draft.countryId"
              :options="countryOptions"
              placeholder="País"
            />
          </template>
        </BaseField>
        <BaseField label="Departamento" required>
          <template #default="{ id }">
            <BaseSelect
              :id="id"
              v-model="draft.stateId"
              :options="stateOptions"
              :placeholder="loadingStates ? 'Cargando…' : 'Departamento'"
              :disabled="!draft.countryId"
            />
          </template>
        </BaseField>
        <BaseField label="Ciudad" required :error="err('cityId')">
          <template #default="{ id }">
            <BaseSelect
              :id="id"
              v-model="draft.cityId"
              :options="cityOptions"
              :placeholder="loadingCities ? 'Cargando…' : 'Ciudad'"
              :disabled="!draft.stateId"
              :invalid="!!err('cityId')"
              @blur="markTouched('cityId')"
            />
          </template>
        </BaseField>
      </div>

      <div class="ds-grid-span">
        <BaseField label="Dirección (opcional)">
          <template #default="{ id }">
            <BaseInput :id="id" v-model="draft.address" />
          </template>
        </BaseField>
      </div>
    </div>

    <FeCustomerFiscalFields
      v-model:document-type="draft.documentType"
      v-model:person-type="draft.personType"
      v-model:tax-regime="draft.taxRegime"
      v-model:withholding-agent="draft.withholdingAgent"
      :required="fiscal"
    />

    <div class="createfoot">
      <button type="button" class="ds-btn ds-btn--ghost" @click="emit('back')">Cancelar</button>
      <button
        type="button"
        class="ds-btn ds-btn--primary ds-btn--strong"
        :disabled="!isValid || submitting"
        @click="submit"
      >
        {{ submitting ? 'Creando…' : 'Crear y seleccionar' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
/* Layout via primitivas: .ds-stack, .ds-grid-2 / .ds-grid-span (rejillas del
   alta), .ds-flex-row, .ds-hint, .ds-meta y .ds-text-strong. */
.cpk-create {
  font-family: var(--font-sans);
}

.back {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--amatista-700);
  cursor: pointer;
  padding: 0;
  margin-bottom: 14px;
}

.failbanner {
  padding: 10px 12px;
  border-radius: 9px;
  background: var(--danger-100);
  border: 1px solid var(--danger-border);
  color: oklch(48% 0.16 25deg);
  font-size: 12.5px;
  margin-bottom: 12px;
}

.sectlabel {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: var(--warm-600);
  margin-bottom: 10px;
}

/* El gap propio de este formulario; las dos columnas y su colapso en 640px los
   pone `.ds-grid-2`. */
.grid {
  gap: var(--space-16) var(--space-20);
}

/* País/Depto/Ciudad se queda con su rejilla propia: son 3 columnas, no 2, y
   ninguna primitiva las replica. */
.geo {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px 20px;
}

@media (width <= 640px) {
  .geo {
    grid-template-columns: 1fr;
  }
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

.createfoot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid var(--warm-200);
}
</style>
