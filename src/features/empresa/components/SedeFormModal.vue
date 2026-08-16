<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { MapPin, Pencil } from 'lucide-vue-next'
import ModalShell from '@/components/ui/ModalShell.vue'
import BaseField from '@/components/ui/BaseField.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import { useGeoCascade } from '@/features/dashboard/views/consulta/nueva/composables/useGeoCascade'
import { scrollToFirstError } from '@/composables/scrollToError'
import type { BranchResponse, SaveBranchRequest } from '@/features/branches/types/branch.types'

const props = defineProps<{
  open: boolean
  initial: BranchResponse | null
}>()

const emit = defineEmits<{
  save: [payload: { id: number | null; body: SaveBranchRequest }]
  close: []
}>()

const isEditing = computed(() => !!props.initial)

interface Draft {
  name: string
  code: string
  address: string
  phone: string
}
function emptyDraft(): Draft {
  return { name: '', code: '', address: '', phone: '' }
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

// Ciudad efectiva enviada al backend: la elegida en la cascada, o —en edición— la original si no se cambia.
const committedCityId = computed<number | null>(() =>
  cityId.value ? Number(cityId.value) : (props.initial?.city?.id ?? null),
)
const currentCityName = computed(() => props.initial?.city?.name ?? null)

watch(
  () => props.open,
  (open) => {
    if (!open) return
    submitted.value = false
    countryId.value = ''
    stateId.value = ''
    cityId.value = ''
    const init = props.initial
    Object.assign(
      draft,
      init
        ? { name: init.name, code: init.code, address: init.address ?? '', phone: init.phone ?? '' }
        : emptyDraft(),
    )
  },
)

const errors = computed(() => ({
  name: draft.name.trim().length >= 2 ? null : 'Ingresa el nombre de la sede (mín. 2).',
  code: draft.code.trim() ? null : 'Ingresa un código.',
  city: committedCityId.value != null ? null : 'Selecciona la ciudad.',
}))
const isValid = computed(() => Object.values(errors.value).every((e) => !e))

type ErrorKey = 'name' | 'code' | 'city'
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
  const body: SaveBranchRequest = {
    name: draft.name.trim(),
    code: draft.code.trim().toUpperCase(),
    address: draft.address.trim() || null,
    phone: draft.phone.trim() || null,
    cityId: selectedCityId,
  }
  emit('save', { id: props.initial?.id ?? null, body })
}
</script>

<template>
  <ModalShell
    :open="open"
    :title="isEditing ? 'Editar sede' : 'Nueva sede'"
    :subtitle="
      isEditing
        ? 'Actualiza los datos de la sucursal.'
        : 'Registra una nueva sucursal de la empresa.'
    "
    :icon="isEditing ? Pencil : MapPin"
    accent="amatista"
    :width="520"
    @close="emit('close')"
  >
    <template #body>
      <div class="form">
        <div class="grid-2">
          <BaseField label="Nombre de la sede" required :error="err('name')">
            <template #default="{ id }">
              <BaseInput
                :id="id"
                v-model="draft.name"
                placeholder="Sede Sur"
                :invalid="!!err('name')"
              />
            </template>
          </BaseField>
          <BaseField label="Código" required :error="err('code')">
            <template #default="{ id }">
              <BaseInput
                :id="id"
                v-model="draft.code"
                placeholder="SUR"
                :invalid="!!err('code')"
                @update:model-value="
                  draft.code = String($event)
                    .replace(/[^A-Za-z0-9]/g, '')
                    .toUpperCase()
                "
              />
            </template>
          </BaseField>
        </div>

        <BaseField
          label="Ubicación"
          required
          :error="err('city')"
          :hint="
            isEditing && currentCityName && !cityId
              ? `Ciudad actual: ${currentCityName}. Elige país, departamento y ciudad para cambiarla.`
              : undefined
          "
        >
          <template #default>
            <div class="grid-3">
              <BaseSelect
                v-model="countryId"
                :options="countryOptions"
                :placeholder="loadingCountries ? 'Cargando…' : 'País'"
              />
              <BaseSelect
                v-model="stateId"
                :options="stateOptions"
                :placeholder="loadingStates ? 'Cargando…' : 'Departamento'"
                :disabled="!countryId"
              />
              <BaseSelect
                v-model="cityId"
                :options="cityOptions"
                :placeholder="loadingCities ? 'Cargando…' : 'Ciudad'"
                :disabled="!stateId"
              />
            </div>
          </template>
        </BaseField>

        <BaseField label="Dirección">
          <template #default="{ id }">
            <BaseInput :id="id" v-model="draft.address" placeholder="Cra 00 # 00-00" />
          </template>
        </BaseField>

        <BaseField label="Teléfono">
          <template #default="{ id }">
            <BaseInput
              :id="id"
              v-model="draft.phone"
              placeholder="+57 601 000 0000"
              inputmode="tel"
              @update:model-value="draft.phone = String($event).replace(/[^+\d\s\-()]/g, '')"
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
        {{ isEditing ? 'Guardar cambios' : 'Crear sede' }}
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
.form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px 22px;
}

.grid-3 {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 12px;
}

@media (width <= 620px) {
  .grid-2,
  .grid-3 {
    grid-template-columns: 1fr;
  }
}
</style>
