<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { BarChart3 } from 'lucide-vue-next'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
import BaseField from '@/features/dashboard/components/ui/BaseField.vue'
import BaseInput from '@/features/dashboard/components/ui/BaseInput.vue'
import { getProblemDetailMessage } from '@/services/http/http.client'
import { useTienda } from '../composables/useTienda'
import type { TaxResponse } from '../types/tienda'

const props = defineProps<{
  open: boolean
  initial: TaxResponse | null
}>()

const emit = defineEmits<{
  close: []
  saved: [item: TaxResponse]
}>()

const store = useTienda()

const draft = reactive({ name: '', pct: '' })
const submitted = ref(false)
const busy = ref(false)
const saveError = ref<string | null>(null)

const isEdit = computed(() => props.initial !== null)

watch(
  () => props.open,
  (open) => {
    if (!open) return
    submitted.value = false
    saveError.value = null
    if (props.initial) {
      draft.name = props.initial.name
      draft.pct = String(props.initial.percentage)
    } else {
      draft.name = ''
      draft.pct = ''
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

function err(field: 'name' | 'pct'): string | undefined {
  return submitted.value ? errors.value[field] ?? undefined : undefined
}

const isValid = computed(() => Object.values(errors.value).every((e) => e === null))

async function submit() {
  submitted.value = true
  if (!isValid.value || busy.value) return
  busy.value = true
  saveError.value = null
  const payload = { name: draft.name.trim(), percentage: num(draft.pct) }
  try {
    const saved = props.initial
      ? await store.updateTax(props.initial.id, payload)
      : await store.createTax(payload)
    emit('saved', saved)
    emit('close')
  } catch (e) {
    saveError.value = getProblemDetailMessage(e, 'No se pudo guardar el impuesto')
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
      <div v-if="saveError" class="banner error">{{ saveError }}</div>
      <div class="form">
        <BaseField label="Nombre" required :error="err('name')">
          <template #default="{ id }">
            <BaseInput :id="id" v-model="draft.name" :invalid="!!err('name')" placeholder="Ej. IVA 19%, Impoconsumo 8%, Exento…" />
          </template>
        </BaseField>
        <BaseField label="Porcentaje" required :error="err('pct')">
          <template #default="{ id }">
            <div class="pct">
              <BaseInput :id="id" v-model="draft.pct" :invalid="!!err('pct')" inputmode="decimal" placeholder="19" />
              <span class="pct-sign">%</span>
            </div>
          </template>
        </BaseField>
        <p class="note">
          Usa 0% para impuestos exentos o excluidos. El nombre es libre: puedes crear IVA,
          impoconsumo, tasas especiales, etc.
        </p>
      </div>
    </template>

    <template #footer-actions>
      <button type="button" class="btn-ghost" @click="emit('close')">Cancelar</button>
      <button type="button" class="btn-primary" :disabled="busy" @click="submit">
        {{ busy ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear impuesto' }}
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
.form { display: flex; flex-direction: column; gap: 16px; }
.pct { display: inline-flex; align-items: center; gap: 8px; max-width: 140px; }
.pct-sign { font-size: 14px; color: var(--warm-600); }
.note { margin: 0; font-size: 12.5px; color: var(--warm-500); line-height: 1.55; }
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
