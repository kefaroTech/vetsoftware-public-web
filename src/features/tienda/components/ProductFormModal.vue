<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Package } from 'lucide-vue-next'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
import BaseField from '@/features/dashboard/components/ui/BaseField.vue'
import BaseInput from '@/features/dashboard/components/ui/BaseInput.vue'
import BaseSelect from '@/features/dashboard/components/ui/BaseSelect.vue'
import BaseTextarea from '@/features/dashboard/components/ui/BaseTextarea.vue'
import { getProblemDetailMessage } from '@/services/http/http.client'
import { useTienda } from '../composables/useTienda'
import type { ProductPayload, ProductResponse } from '../types/tienda'

const props = defineProps<{
  open: boolean
  initial: ProductResponse | null
}>()

const emit = defineEmits<{
  close: []
  saved: [item: ProductResponse]
}>()

const store = useTienda()

interface Draft {
  name: string
  code: string
  purchasePrice: string
  salePrice: string
  currentStock: string
  minStock: string
  provider: string
  hasTax: boolean
  expireDate: boolean
  notes: string
  productCategoryId: string
  taxId: string
}

function emptyDraft(): Draft {
  return {
    name: '', code: '', purchasePrice: '', salePrice: '', currentStock: '0', minStock: '0',
    provider: '', hasTax: false, expireDate: false, notes: '', productCategoryId: '', taxId: '',
  }
}

const draft = reactive<Draft>(emptyDraft())
const submitted = ref(false)
const busy = ref(false)
const saveError = ref<string | null>(null)

const categoryOptions = computed(() =>
  store.productCategories.value.map((c) => ({ value: String(c.id), label: c.name })),
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
        code: it.code,
        purchasePrice: String(it.purchasePrice),
        salePrice: String(it.salePrice),
        currentStock: String(it.currentStock),
        minStock: String(it.minStock),
        provider: it.provider ?? '',
        hasTax: it.hasTax,
        expireDate: it.expireDate,
        notes: it.notes ?? '',
        productCategoryId: String(it.productCategory.id),
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
  code: draft.code.trim().length < 1 ? 'Requerido' : null,
  purchasePrice: !(num(draft.purchasePrice) >= 0) ? 'Número ≥ 0' : null,
  salePrice: !(num(draft.salePrice) >= 0) ? 'Número ≥ 0' : null,
  currentStock: !(Number.isInteger(num(draft.currentStock)) && num(draft.currentStock) >= 0) ? 'Entero ≥ 0' : null,
  minStock: !(Number.isInteger(num(draft.minStock)) && num(draft.minStock) >= 0) ? 'Entero ≥ 0' : null,
  productCategoryId: !draft.productCategoryId ? 'Selecciona una categoría' : null,
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
  const payload: ProductPayload = {
    name: draft.name.trim(),
    code: draft.code.trim(),
    purchasePrice: num(draft.purchasePrice),
    salePrice: num(draft.salePrice),
    currentStock: num(draft.currentStock),
    minStock: num(draft.minStock),
    provider: draft.provider.trim() || null,
    hasTax: draft.hasTax,
    expireDate: draft.expireDate,
    notes: draft.notes.trim() || null,
    productCategoryId: Number(draft.productCategoryId),
    taxId: draft.taxId ? Number(draft.taxId) : null,
  }
  try {
    const saved = props.initial
      ? await store.updateProduct(props.initial.id, payload)
      : await store.createProduct(payload)
    emit('saved', saved)
    emit('close')
  } catch (e) {
    saveError.value = getProblemDetailMessage(e, 'No se pudo guardar el producto')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <ModalShell
    :open="open"
    :title="isEdit ? 'Editar producto' : 'Nuevo producto'"
    subtitle="Datos de inventario y precio"
    :icon="Package"
    :width="680"
    @close="emit('close')"
  >
    <template #body>
      <div v-if="saveError" class="banner error">{{ saveError }}</div>
      <div class="grid">
        <BaseField label="Nombre" required :error="err('name')" class="col-2">
          <template #default="{ id }">
            <BaseInput :id="id" v-model="draft.name" :invalid="!!err('name')" placeholder="Alimento premium 2kg" />
          </template>
        </BaseField>
        <BaseField label="Código / SKU" required :error="err('code')">
          <template #default="{ id }">
            <BaseInput :id="id" v-model="draft.code" :invalid="!!err('code')" placeholder="SKU-001" />
          </template>
        </BaseField>
        <BaseField label="Categoría" required :error="err('productCategoryId')">
          <template #default="{ id }">
            <BaseSelect :id="id" v-model="draft.productCategoryId" :options="categoryOptions" :invalid="!!err('productCategoryId')" placeholder="Selecciona…" />
          </template>
        </BaseField>
        <BaseField label="Precio de compra" required :error="err('purchasePrice')">
          <template #default="{ id }">
            <BaseInput :id="id" v-model="draft.purchasePrice" :invalid="!!err('purchasePrice')" inputmode="decimal" placeholder="0" />
          </template>
        </BaseField>
        <BaseField label="Precio de venta" required :error="err('salePrice')">
          <template #default="{ id }">
            <BaseInput :id="id" v-model="draft.salePrice" :invalid="!!err('salePrice')" inputmode="decimal" placeholder="0" />
          </template>
        </BaseField>
        <BaseField label="Stock actual" required :error="err('currentStock')">
          <template #default="{ id }">
            <BaseInput :id="id" v-model="draft.currentStock" :invalid="!!err('currentStock')" inputmode="numeric" placeholder="0" />
          </template>
        </BaseField>
        <BaseField label="Stock mínimo" required :error="err('minStock')">
          <template #default="{ id }">
            <BaseInput :id="id" v-model="draft.minStock" :invalid="!!err('minStock')" inputmode="numeric" placeholder="0" />
          </template>
        </BaseField>
        <BaseField label="Proveedor">
          <template #default="{ id }">
            <BaseInput :id="id" v-model="draft.provider" placeholder="Opcional" />
          </template>
        </BaseField>
        <BaseField label="Impuesto">
          <template #default="{ id }">
            <BaseSelect :id="id" v-model="draft.taxId" :options="taxOptions" placeholder="Sin impuesto" />
          </template>
        </BaseField>
        <div class="checks col-2">
          <label class="check">
            <input v-model="draft.hasTax" type="checkbox" />
            <span>Aplica impuesto en la venta</span>
          </label>
          <label class="check">
            <input v-model="draft.expireDate" type="checkbox" />
            <span>Maneja fecha de vencimiento</span>
          </label>
        </div>
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
.grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px 20px; }
.col-2 { grid-column: 1 / -1; }
.checks { display: flex; gap: 24px; flex-wrap: wrap; }
.check { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--warm-800); cursor: pointer; }
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
