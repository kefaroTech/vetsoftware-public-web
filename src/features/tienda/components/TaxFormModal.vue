<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { BarChart3 } from 'lucide-vue-next'
import ModalShell from '@/components/ui/ModalShell.vue'
import BaseField from '@/components/ui/BaseField.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import { getProblemDetailMessage, isConcurrencyConflict } from '@/services/http/http.client'
import { useToast } from '@/composables/useToast'
import { useTienda } from '../composables/useTienda'
import type { TaxPayload } from '../types/tax.types'
import type { TaxResponse, TaxScheme } from '../types/tienda'
import { scrollToFirstError } from '@/composables/scrollToError'

const props = defineProps<{
  open: boolean
  initial: TaxResponse | null
}>()

const emit = defineEmits<{
  close: []
  saved: [item: TaxResponse]
}>()

const CONFLICT_MESSAGE =
  'El registro fue modificado por otra operación; se recargó la información. Revisa y reintenta.'

const TAX_SCHEME_OPTIONS: { value: TaxScheme; label: string }[] = [
  { value: 'IVA', label: 'IVA' },
  { value: 'INC', label: 'INC (Impuesto Nacional al Consumo)' },
]

const store = useTienda()
const toast = useToast()

interface Draft {
  name: string
  pct: string
  taxScheme: TaxScheme
  /** Versión (@Version) del item en edición; null en creación. Se reenvía en el PUT. */
  version: number | null
}

const draft = reactive<Draft>({ name: '', pct: '', taxScheme: 'IVA', version: null })

type FieldKey = 'name' | 'pct'
const touched = reactive<Record<FieldKey, boolean>>({ name: false, pct: false })
function resetTouched() {
  ;(Object.keys(touched) as FieldKey[]).forEach((k) => (touched[k] = false))
}
function markTouched(field: FieldKey) {
  touched[field] = true
}

const busy = ref(false)
const saveError = ref<string | null>(null)

const isEdit = computed(() => props.initial !== null)

/** Carga el draft desde un impuesto existente (apertura en modo edición o re-hidratación tras 409). */
function hydrate(it: TaxResponse) {
  draft.name = it.name
  draft.pct = String(it.percentage)
  draft.taxScheme = it.taxScheme
  draft.version = it.version
}

watch(
  () => props.open,
  (open) => {
    if (!open) return
    resetTouched()
    saveError.value = null
    if (props.initial) {
      hydrate(props.initial)
    } else {
      draft.name = ''
      draft.pct = ''
      draft.taxScheme = 'IVA'
      draft.version = null
    }
  },
)

function num(v: string): number {
  return Number(String(v).replace(',', '.'))
}

const errors = computed(() => ({
  name: draft.name.trim().length < 2 ? 'Mínimo 2 caracteres' : null,
  pct: !(num(draft.pct) >= 0) || draft.pct.trim() === '' ? 'Porcentaje ≥ 0' : null,
}))

function err(field: FieldKey): string | undefined {
  return touched[field] ? (errors.value[field] ?? undefined) : undefined
}

const isValid = computed(() => Object.values(errors.value).every((e) => e === null))

/** Valida marcando todos los campos como tocados; expuesto para el patrón `defineExpose(validate)`. */
function validate(): boolean {
  ;(Object.keys(touched) as FieldKey[]).forEach((k) => (touched[k] = true))
  return isValid.value
}
defineExpose({ validate })

async function submit() {
  if (busy.value) return
  if (!validate()) {
    scrollToFirstError()
    return
  }
  busy.value = true
  saveError.value = null
  const payload: TaxPayload = {
    name: draft.name.trim(),
    percentage: num(draft.pct),
    taxScheme: draft.taxScheme,
  }
  // En edición reenviamos la versión leída (@Version) para que el backend detecte conflictos.
  if (props.initial && draft.version != null) payload.version = draft.version
  const initialId = props.initial?.id
  try {
    const saved = props.initial
      ? await store.updateTax(props.initial.id, payload)
      : await store.createTax(payload)
    emit('saved', saved)
    emit('close')
  } catch (e) {
    if (isConcurrencyConflict(e)) {
      // Recargamos el catálogo para obtener la versión fresca y re-hidratamos el form para reintentar.
      await store.refresh()
      const fresh = initialId == null ? null : store.taxes.value.find((tax) => tax.id === initialId)
      if (fresh) hydrate(fresh)
      saveError.value = CONFLICT_MESSAGE
      toast.warn('Conflicto de concurrencia', CONFLICT_MESSAGE)
    } else {
      saveError.value = getProblemDetailMessage(e, 'No se pudo guardar el impuesto')
    }
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <ModalShell
    :open="open"
    :title="isEdit ? 'Editar impuesto' : 'Nuevo impuesto'"
    subtitle="Tasa de impuesto"
    :icon="BarChart3"
    :width="460"
    @close="emit('close')"
  >
    <template #body>
      <div v-if="saveError" class="ds-banner ds-banner--error">{{ saveError }}</div>
      <div class="form">
        <BaseField label="Nombre" required :error="err('name')">
          <template #default="{ id }">
            <BaseInput
              :id="id"
              v-model="draft.name"
              :invalid="!!err('name')"
              placeholder="Ej. IVA 19%, Impoconsumo 8%, Exento…"
              @blur="markTouched('name')"
            />
          </template>
        </BaseField>
        <BaseField label="Porcentaje" required :error="err('pct')">
          <template #default="{ id }">
            <div class="pct">
              <BaseInput
                :id="id"
                v-model="draft.pct"
                :invalid="!!err('pct')"
                inputmode="decimal"
                placeholder="19"
                @blur="markTouched('pct')"
              />
              <span class="pct-sign">%</span>
            </div>
          </template>
        </BaseField>
        <BaseField label="Tributo" required>
          <template #default="{ id }">
            <BaseSelect :id="id" v-model="draft.taxScheme" :options="TAX_SCHEME_OPTIONS" />
          </template>
        </BaseField>
        <p class="note">
          Usa 0% para impuestos exentos o excluidos. El nombre es libre: puedes crear IVA,
          impoconsumo, tasas especiales, etc.
        </p>
      </div>
    </template>

    <template #footer-actions>
      <button type="button" class="ds-btn ds-btn--ghost ds-btn--lg" @click="emit('close')">
        Cancelar
      </button>
      <button
        type="button"
        class="ds-btn ds-btn--primary ds-btn--lg"
        :disabled="busy"
        @click="submit"
      >
        {{ busy ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear impuesto' }}
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
.form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.pct {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-width: 140px;
}
.pct-sign {
  font-size: 14px;
  color: var(--warm-600);
}
.note {
  margin: 0;
  font-size: 12.5px;
  color: var(--warm-500);
  line-height: 1.55;
}
</style>
