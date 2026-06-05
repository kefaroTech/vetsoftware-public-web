<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Stethoscope } from 'lucide-vue-next'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
import BaseField from '@/features/dashboard/components/ui/BaseField.vue'
import BaseInput from '@/features/dashboard/components/ui/BaseInput.vue'
import BaseSelect from '@/features/dashboard/components/ui/BaseSelect.vue'
import BaseTextarea from '@/features/dashboard/components/ui/BaseTextarea.vue'
import { getProblemDetailMessage } from '@/services/http/http.client'
import { useTienda } from '../composables/useTienda'
import type { ServicePayload, ServiceResponse } from '../types/tienda'

const props = defineProps<{
  open: boolean
  initial: ServiceResponse | null
}>()

const emit = defineEmits<{
  close: []
  saved: [item: ServiceResponse]
}>()

const store = useTienda()

interface Draft {
  name: string
  price: string
  hasTax: boolean
  notes: string
  serviceCategoryId: string
  taxId: string
}

function emptyDraft(): Draft {
  return { name: '', price: '', hasTax: false, notes: '', serviceCategoryId: '', taxId: '' }
}

const draft = reactive<Draft>(emptyDraft())
const submitted = ref(false)
const busy = ref(false)
const saveError = ref<string | null>(null)

const categoryOptions = computed(() =>
  store.serviceCategories.value.map((c) => ({ value: String(c.id), label: c.name })),
)
const taxOptions = computed(() => [
  { value: '', label: 'Sin impuesto' },
  ...store.taxes.value.map((t) => ({ value: String(t.id), label: `${t.name} (${t.percentage}%)` })),
])

const isEdit = computed(() => props.initial !== null)

watch(
  () => props.open,
  (open) => {
    if (!open) return
    submitted.value = false
    saveError.value = null
    const it = props.initial
    if (it) {
      Object.assign(draft, {
        name: it.name,
        price: String(it.price),
        hasTax: it.hasTax,
        notes: it.notes ?? '',
        serviceCategoryId: String(it.serviceCategory.id),
        taxId: it.tax ? String(it.tax.id) : '',
      } satisfies Draft)
    } else {
      Object.assign(draft, emptyDraft())
    }
  },
)

function num(v: string): number {
  return Number(String(v).replace(',', '.'))
}

const errors = computed(() => ({
  name: draft.name.trim().length < 2 ? 'Mínimo 2 caracteres' : null,
  price: !(num(draft.price) >= 0) ? 'Número ≥ 0' : null,
  serviceCategoryId: !draft.serviceCategoryId ? 'Selecciona una categoría' : null,
}))

function err(field: string): string | undefined {
  return submitted.value ? (errors.value as Record<string, string | null>)[field] ?? undefined : undefined
}

const isValid = computed(() => Object.values(errors.value).every((e) => e === null))

async function submit() {
  submitted.value = true
  if (!isValid.value || busy.value) return
  busy.value = true
  saveError.value = null
  const payload: ServicePayload = {
    name: draft.name.trim(),
    price: num(draft.price),
    hasTax: draft.hasTax,
    notes: draft.notes.trim() || null,
    serviceCategoryId: Number(draft.serviceCategoryId),
    taxId: draft.taxId ? Number(draft.taxId) : null,
  }
  try {
    const saved = props.initial
      ? await store.updateService(props.initial.id, payload)
      : await store.createService(payload)
    emit('saved', saved)
    emit('close')
  } catch (e) {
    saveError.value = getProblemDetailMessage(e, 'No se pudo guardar el servicio')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <ModalShell
    :open="open"
    :title="isEdit ? 'Editar servicio' : 'Nuevo servicio'"
    subtitle="Servicio facturable de la clínica"
    :icon="Stethoscope"
    :width="600"
    @close="emit('close')"
  >
    <template #body>
      <div v-if="saveError" class="banner error">{{ saveError }}</div>
      <div class="grid">
        <BaseField label="Nombre" required :error="err('name')" class="col-2">
          <template #default="{ id }">
            <BaseInput :id="id" v-model="draft.name" :invalid="!!err('name')" placeholder="Consulta general" />
          </template>
        </BaseField>
        <BaseField label="Categoría" required :error="err('serviceCategoryId')">
          <template #default="{ id }">
            <BaseSelect :id="id" v-model="draft.serviceCategoryId" :options="categoryOptions" :invalid="!!err('serviceCategoryId')" placeholder="Selecciona…" />
          </template>
        </BaseField>
        <BaseField label="Precio" required :error="err('price')">
          <template #default="{ id }">
            <BaseInput :id="id" v-model="draft.price" :invalid="!!err('price')" inputmode="decimal" placeholder="0" />
          </template>
        </BaseField>
        <BaseField label="Impuesto">
          <template #default="{ id }">
            <BaseSelect :id="id" v-model="draft.taxId" :options="taxOptions" placeholder="Sin impuesto" />
          </template>
        </BaseField>
        <label class="check">
          <input v-model="draft.hasTax" type="checkbox" />
          <span>Aplica impuesto en la venta</span>
        </label>
        <BaseField label="Notas" class="col-2">
          <template #default="{ id }">
            <BaseTextarea :id="id" v-model="draft.notes" :rows="2" placeholder="Opcional" />
          </template>
        </BaseField>
      </div>
    </template>

    <template #footer-actions>
      <button type="button" class="btn-ghost" @click="emit('close')">Cancelar</button>
      <button type="button" class="btn-primary" :disabled="busy" @click="submit">
        {{ busy ? 'Guardando…' : 'Guardar' }}
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
.grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px 20px; align-items: end; }
.col-2 { grid-column: 1 / -1; }
.check { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--warm-800); cursor: pointer; padding-bottom: 10px; }
.check input { width: 16px; height: 16px; accent-color: var(--amatista-600); }
.banner.error { background: oklch(95% 0.06 25); border: 1px solid oklch(85% 0.12 25); color: oklch(40% 0.18 25); border-radius: 8px; padding: 10px 14px; font-size: 13px; margin-bottom: 14px; }
.btn-primary {
  font-family: inherit; font-size: 13.5px; font-weight: 500; padding: 10px 18px; border-radius: 9px; cursor: pointer;
  border: none; color: white;
  background: linear-gradient(135deg, oklch(45% 0.18 var(--hue)), oklch(38% 0.18 calc(var(--hue) - 5)));
}
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-ghost {
  font-family: inherit; font-size: 13.5px; font-weight: 500; padding: 10px 18px; border-radius: 9px; cursor: pointer;
  background: transparent; border: 1px solid var(--warm-200); color: var(--warm-700);
}
.btn-ghost:hover { background: var(--warm-100); }
</style>
