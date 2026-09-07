<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Building2 } from 'lucide-vue-next'
import ModalShell from '@/components/ui/ModalShell.vue'
import BaseField from '@/components/ui/BaseField.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import { useGeoCascade } from '@/features/dashboard/views/consulta/nueva/composables/useGeoCascade'
import { scrollToFirstError } from '@/composables/scrollToError'
import { sanitizePhone, PHONE_PLACEHOLDER_LANDLINE } from '@/composables/phone'
import type { CompanyResponse, UpdateCompanyRequest } from '../types/company.types'

const props = defineProps<{
  open: boolean
  company: CompanyResponse | null
}>()

const emit = defineEmits<{
  save: [payload: UpdateCompanyRequest]
  close: []
}>()

interface Draft {
  name: string
  identifier: string
  address: string
  contactNumber: string
}
function emptyDraft(): Draft {
  return { name: '', identifier: '', address: '', contactNumber: '' }
}
const draft = reactive<Draft>(emptyDraft())
const submitted = ref(false)

// Cascada geográfica país → depto → ciudad (el backend exige cityId; no hay listado plano de ciudades).
const countryId = ref('')
const stateId = ref('')
const cityId = ref('')
const {
  countryOptions,
  stateOptions,
  cityOptions,
  loadingCountries,
  loadingStates,
  loadingCities,
} = useGeoCascade(countryId, stateId)

const committedCityId = computed<number | null>(() =>
  cityId.value ? Number(cityId.value) : (props.company?.city?.id ?? null),
)
const currentCityName = computed(() => props.company?.city?.name ?? null)

watch(
  () => props.open,
  (open) => {
    if (!open) return
    submitted.value = false
    countryId.value = ''
    stateId.value = ''
    cityId.value = ''
    const c = props.company
    Object.assign(
      draft,
      c
        ? {
            name: c.name,
            identifier: c.identifier,
            address: c.address ?? '',
            contactNumber: c.contactNumber ?? '',
          }
        : emptyDraft(),
    )
  },
)

const errors = computed(() => ({
  name: draft.name.trim().length >= 2 ? null : 'Ingresa el nombre de la empresa (mín. 2).',
  identifier: draft.identifier.trim() ? null : 'Ingresa el identificador de la empresa.',
  city: committedCityId.value != null ? null : 'Selecciona la ciudad.',
}))
const isValid = computed(() => Object.values(errors.value).every((e) => !e))

type ErrorKey = 'name' | 'identifier' | 'city'
function err(field: ErrorKey): string | undefined {
  return submitted.value ? (errors.value[field] ?? undefined) : undefined
}

function submit() {
  submitted.value = true
  const selectedCityId = committedCityId.value
  if (!isValid.value || selectedCityId == null) {
    scrollToFirstError()
    return
  }
  emit('save', {
    name: draft.name.trim(),
    identifier: draft.identifier.trim(),
    address: draft.address.trim() || undefined,
    contactNumber: draft.contactNumber.trim() || undefined,
    cityId: selectedCityId,
  })
}
</script>

<template>
  <ModalShell
    :open="open"
    title="Editar datos de la empresa"
    subtitle="Actualiza el nombre, identificador y ubicación de tu empresa."
    :icon="Building2"
    accent="amatista"
    :width="520"
    @close="emit('close')"
  >
    <template #body>
      <div class="ds-stack ds-stack--18">
        <div class="grid-2 ds-grid-2">
          <BaseField label="Nombre de la empresa" required :error="err('name')">
            <template #default="{ id }">
              <BaseInput
                :id="id"
                v-model="draft.name"
                placeholder="Clínica Veterinaria Sur"
                :invalid="!!err('name')"
              />
            </template>
          </BaseField>
          <BaseField label="Identificador (NIT)" required :error="err('identifier')">
            <template #default="{ id }">
              <BaseInput
                :id="id"
                v-model="draft.identifier"
                placeholder="900123456"
                :invalid="!!err('identifier')"
              />
            </template>
          </BaseField>
        </div>

        <BaseField
          label="Ubicación"
          required
          :error="err('city')"
          :hint="
            currentCityName && !cityId
              ? `Ciudad actual: ${currentCityName}. Elige país, departamento y ciudad para cambiarla.`
              : undefined
          "
        >
          <template #default>
            <div class="grid-3">
              <BaseSelect
                v-model="countryId"
                :options="countryOptions"
                :placeholder="loadingCountries ? 'Cargando…' : 'Selecciona país'"
              />
              <BaseSelect
                v-model="stateId"
                :options="stateOptions"
                :placeholder="loadingStates ? 'Cargando…' : 'Selecciona departamento'"
                :disabled="!countryId"
              />
              <BaseSelect
                v-model="cityId"
                :options="cityOptions"
                :placeholder="loadingCities ? 'Cargando…' : 'Selecciona ciudad'"
                :disabled="!stateId"
              />
            </div>
          </template>
        </BaseField>

        <BaseField label="Dirección">
          <template #default="{ id }">
            <BaseInput :id="id" v-model="draft.address" placeholder="Cra 7 # 45-12" />
          </template>
        </BaseField>

        <BaseField label="Teléfono de contacto">
          <template #default="{ id }">
            <BaseInput
              :id="id"
              v-model="draft.contactNumber"
              :placeholder="PHONE_PLACEHOLDER_LANDLINE"
              inputmode="tel"
              @update:model-value="draft.contactNumber = sanitizePhone(String($event))"
            />
          </template>
        </BaseField>
      </div>
    </template>

    <template #footer-actions>
      <button type="button" class="ds-btn ds-btn--ghost" @click="emit('close')">Cancelar</button>
      <button
        type="button"
        class="ds-btn ds-btn--primary ds-btn--strong ds-btn--elevated"
        @click="submit"
      >
        Guardar cambios
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
.grid-2 {
  gap: 18px 22px;
}

.grid-3 {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 12px;
}

@media (width <= 620px) {
  .grid-3 {
    grid-template-columns: 1fr;
  }
}
</style>
