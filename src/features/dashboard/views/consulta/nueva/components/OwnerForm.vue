<script setup lang="ts">
import { computed, reactive, toRef, watch } from 'vue'
import { User, MapPin, IdCard, Phone, Mail, TriangleAlert } from 'lucide-vue-next'
import SectionCard from '@/features/dashboard/components/ui/SectionCard.vue'
import BaseField from '@/features/dashboard/components/ui/BaseField.vue'
import BaseInput from '@/features/dashboard/components/ui/BaseInput.vue'
import BaseSelect from '@/features/dashboard/components/ui/BaseSelect.vue'
import { useGeoCascade } from '../composables/useGeoCascade'
import type { OwnerDraft } from '../composables/useNuevaConsultaDraft'

const props = defineProps<{ modelValue: OwnerDraft }>()
defineEmits<{ 'update:modelValue': [value: OwnerDraft] }>()

const draft = computed(() => props.modelValue)

const countryRef = toRef(() => props.modelValue.countryId)
const stateRef = toRef(() => props.modelValue.stateId)
const {
  countryOptions,
  stateOptions,
  cityOptions,
  loadingCountries,
  loadingStates,
  loadingCities,
  error: geoError,
} = useGeoCascade(countryRef, stateRef)

watch(
  () => draft.value.countryId,
  (val, prev) => {
    if (val !== prev) {
      draft.value.stateId = ''
      draft.value.cityId = ''
    }
  },
)
watch(
  () => draft.value.stateId,
  (val, prev) => {
    if (val !== prev) {
      draft.value.cityId = ''
    }
  },
)

type FieldKey =
  | 'name'
  | 'document'
  | 'phone'
  | 'email'
  | 'countryId'
  | 'stateId'
  | 'cityId'

const touched = reactive<Record<FieldKey, boolean>>({
  name: false,
  document: false,
  phone: false,
  email: false,
  countryId: false,
  stateId: false,
  cityId: false,
})

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function validateName(v: string): string | null {
  if (!v.trim()) return 'El nombre es obligatorio.'
  if (v.trim().length < 2) return 'Debe tener al menos 2 caracteres.'
  return null
}
function validateDocument(v: string): string | null {
  const t = v.trim()
  if (!t) return 'El documento es obligatorio.'
  if (!/^[A-Za-z0-9]+$/.test(t))
    return 'Solo se permiten letras y números (sin espacios ni símbolos).'
  if (t.length < 5) return 'Debe tener al menos 5 caracteres.'
  if (t.length > 20) return 'No puede superar los 20 caracteres.'
  return null
}
function validatePhone(v: string): string | null {
  const t = v.trim()
  if (!t) return null
  if (!/^[+\d\s\-()]+$/.test(t))
    return 'Solo se permiten dígitos, espacios, +, - y paréntesis.'
  const digits = t.replace(/\D/g, '')
  if (digits.length < 7) return 'Debe tener al menos 7 dígitos.'
  if (digits.length > 15) return 'No puede superar los 15 dígitos.'
  return null
}
function validateEmail(v: string): string | null {
  const t = v.trim()
  if (!t) return null
  if (!EMAIL_RE.test(t)) return 'Formato de email inválido (ej. nombre@dominio.com).'
  return null
}
function validateRequiredSelect(v: string, label: string): string | null {
  if (!v) return `${label} es obligatorio.`
  return null
}

const errors = computed(() => ({
  name: validateName(draft.value.name),
  document: validateDocument(draft.value.document),
  phone: validatePhone(draft.value.phone),
  email: validateEmail(draft.value.email),
  countryId: validateRequiredSelect(draft.value.countryId, 'El país'),
  stateId: validateRequiredSelect(draft.value.stateId, 'El estado'),
  cityId: validateRequiredSelect(draft.value.cityId, 'La ciudad'),
}))

function err(field: FieldKey): string | undefined {
  return touched[field] && errors.value[field] ? errors.value[field]! : undefined
}

function markTouched(field: FieldKey) {
  touched[field] = true
}

function sanitizeDocument(v: string): string {
  return v.replace(/[^A-Za-z0-9]/g, '')
}
function sanitizePhone(v: string): string {
  return v.replace(/[^+\d\s\-()]/g, '')
}

const documentModel = computed({
  get: () => draft.value.document,
  set: (v) => {
    draft.value.document = sanitizeDocument(v)
  },
})
const phoneModel = computed({
  get: () => draft.value.phone,
  set: (v) => {
    draft.value.phone = sanitizePhone(v)
  },
})

function validate(): boolean {
  ;(Object.keys(touched) as FieldKey[]).forEach((k) => (touched[k] = true))
  return (Object.keys(errors.value) as FieldKey[]).every(
    (k) => !errors.value[k],
  )
}

defineExpose({ validate })
</script>

<template>
  <div class="form">
    <div v-if="geoError" class="geo-error">
      <TriangleAlert :size="13" :stroke-width="1.7" />
      <span>{{ geoError }}</span>
    </div>

    <SectionCard accent :icon="User" title="Datos personales">
      <div class="grid-2">
        <BaseField label="Nombre completo" required :error="err('name')">
          <template #default="{ id }">
            <BaseInput
              :id="id"
              v-model="draft.name"
              placeholder="Ej. Carla Mendoza Ríos"
              :icon="User"
              autocomplete="name"
              :invalid="!!err('name')"
              @blur="markTouched('name')"
            />
          </template>
        </BaseField>
        <BaseField label="Documento de identidad" required :error="err('document')">
          <template #default="{ id }">
            <BaseInput
              :id="id"
              v-model="documentModel"
              placeholder="DNI / RUC / Pasaporte"
              :icon="IdCard"
              inputmode="text"
              :invalid="!!err('document')"
              @blur="markTouched('document')"
            />
          </template>
        </BaseField>
        <BaseField label="Teléfono" hint="Opcional" :error="err('phone')">
          <template #default="{ id }">
            <BaseInput
              :id="id"
              v-model="phoneModel"
              placeholder="+51 …"
              :icon="Phone"
              autocomplete="tel"
              type="tel"
              inputmode="tel"
              :invalid="!!err('phone')"
              @blur="markTouched('phone')"
            />
          </template>
        </BaseField>
        <BaseField
          label="Email"
          hint="Opcional · usado para recordatorios"
          :error="err('email')"
        >
          <template #default="{ id }">
            <BaseInput
              :id="id"
              v-model="draft.email"
              type="email"
              placeholder="correo@ejemplo.com"
              :icon="Mail"
              autocomplete="email"
              inputmode="email"
              :invalid="!!err('email')"
              @blur="markTouched('email')"
            />
          </template>
        </BaseField>
      </div>
    </SectionCard>

    <SectionCard :icon="MapPin" title="Dirección">
      <div class="grid-3">
        <BaseField label="País" required :error="err('countryId')">
          <template #default="{ id }">
            <BaseSelect
              :id="id"
              v-model="draft.countryId"
              :options="countryOptions"
              :placeholder="
                loadingCountries ? 'Cargando…' : 'Selecciona país'
              "
              :disabled="loadingCountries"
              :invalid="!!err('countryId')"
              @blur="markTouched('countryId')"
            />
          </template>
        </BaseField>
        <BaseField label="Estado / Departamento" required :error="err('stateId')">
          <template #default="{ id }">
            <BaseSelect
              :id="id"
              v-model="draft.stateId"
              :options="stateOptions"
              :placeholder="
                loadingStates
                  ? 'Cargando…'
                  : draft.countryId
                    ? 'Selecciona estado'
                    : 'Primero elige un país'
              "
              :disabled="!draft.countryId || loadingStates"
              :invalid="!!err('stateId')"
              @blur="markTouched('stateId')"
            />
          </template>
        </BaseField>
        <BaseField label="Ciudad" required :error="err('cityId')">
          <template #default="{ id }">
            <BaseSelect
              :id="id"
              v-model="draft.cityId"
              :options="cityOptions"
              :placeholder="
                loadingCities
                  ? 'Cargando…'
                  : draft.stateId
                    ? 'Selecciona ciudad'
                    : 'Primero elige un estado'
              "
              :disabled="!draft.stateId || loadingCities"
              :invalid="!!err('cityId')"
              @blur="markTouched('cityId')"
            />
          </template>
        </BaseField>
      </div>
      <div class="full-row">
        <BaseField
          label="Dirección"
          hint="Calle, número, departamento, referencia"
        >
          <template #default="{ id }">
            <BaseInput
              :id="id"
              v-model="draft.address"
              placeholder="Ej. Av. Salaverry 2580, Dpto 502"
            />
          </template>
        </BaseField>
      </div>
    </SectionCard>
  </div>
</template>

<style scoped>
.form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.geo-error {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  padding: 10px 14px;
  background: oklch(94% 0.06 25);
  border: 1px solid oklch(85% 0.10 25);
  color: oklch(35% 0.15 25);
  border-radius: 10px;
}
.grid-2 {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 22px 28px;
}
.grid-3 {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 22px 28px;
  margin-bottom: 22px;
}
.full-row {
  display: block;
}
@media (max-width: 980px) {
  .grid-3 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 640px) {
  .grid-2,
  .grid-3 {
    grid-template-columns: 1fr;
    gap: 18px;
  }
}
</style>
