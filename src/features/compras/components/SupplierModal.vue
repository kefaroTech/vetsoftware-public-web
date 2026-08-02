<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Truck } from 'lucide-vue-next'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
import BaseField from '@/features/dashboard/components/ui/BaseField.vue'
import BaseInput from '@/features/dashboard/components/ui/BaseInput.vue'
import BaseTextarea from '@/features/dashboard/components/ui/BaseTextarea.vue'
import { useSuppliers } from '../composables/useSuppliers'
import { getProblemDetailMessage } from '@/services/http/http.client'
import type { Supplier } from '../types/compras'

const props = defineProps<{ open: boolean; supplier: Supplier | null }>()
const emit = defineEmits<{ close: []; saved: [] }>()

const { create, update } = useSuppliers()

const isEdit = computed(() => props.supplier != null)

const form = reactive({
  name: '',
  taxId: '',
  contactName: '',
  phone: '',
  email: '',
  address: '',
  paymentTermsDays: '',
  notes: '',
})
const submitted = ref(false)
const saving = ref(false)
const serverError = ref<string | null>(null)

const emailError = computed(() =>
  form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())
    ? 'Correo inválido.'
    : null,
)
const nameError = computed(() =>
  form.name.trim().length < 2 ? 'El nombre es obligatorio (mínimo 2 caracteres).' : null,
)
const termsError = computed(() => {
  if (form.paymentTermsDays.trim() === '') return null
  const n = Number(form.paymentTermsDays)
  return Number.isNaN(n) || n < 0 ? 'Días de crédito inválidos.' : null
})

watch(
  () => props.open,
  (o) => {
    if (!o) return
    submitted.value = false
    serverError.value = null
    const s = props.supplier
    form.name = s?.name ?? ''
    form.taxId = s?.taxId ?? ''
    form.contactName = s?.contactName ?? ''
    form.phone = s?.phone ?? ''
    form.email = s?.email ?? ''
    form.address = s?.address ?? ''
    form.paymentTermsDays = s?.paymentTermsDays != null ? String(s.paymentTermsDays) : ''
    form.notes = s?.notes ?? ''
  },
)

async function submit() {
  submitted.value = true
  serverError.value = null
  if (nameError.value || emailError.value || termsError.value) return
  saving.value = true
  try {
    const payload = {
      name: form.name.trim(),
      taxId: form.taxId.trim() || null,
      contactName: form.contactName.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      address: form.address.trim() || null,
      paymentTermsDays: form.paymentTermsDays.trim() ? Number(form.paymentTermsDays) : null,
      notes: form.notes.trim() || null,
    }
    if (isEdit.value && props.supplier) {
      await update(props.supplier.id, { ...payload, version: props.supplier.version })
    } else {
      await create(payload)
    }
    emit('saved')
    emit('close')
  } catch (e) {
    serverError.value = getProblemDetailMessage(e, 'No se pudo guardar el proveedor')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <ModalShell
    :open="open"
    :title="isEdit ? 'Editar proveedor' : 'Nuevo proveedor'"
    subtitle="Ficha del tercero al que le compras"
    :icon="Truck"
    :width="600"
    @close="emit('close')"
  >
    <template #body>
      <p v-if="serverError" class="server-error">{{ serverError }}</p>
      <div class="grid">
        <BaseField
          class="col-2"
          label="Nombre / Razón social"
          required
          :error="submitted ? (nameError ?? undefined) : undefined"
        >
          <BaseInput
            v-model="form.name"
            placeholder="Distribuidora Veterinaria S.A.S"
            :invalid="submitted && !!nameError"
          />
        </BaseField>
        <BaseField label="NIT / documento">
          <BaseInput v-model="form.taxId" placeholder="900123456-7" />
        </BaseField>
        <BaseField
          label="Días de crédito"
          hint="Opcional"
          :error="submitted ? (termsError ?? undefined) : undefined"
        >
          <BaseInput
            v-model="form.paymentTermsDays"
            placeholder="30"
            inputmode="numeric"
            :invalid="submitted && !!termsError"
          />
        </BaseField>
        <BaseField label="Contacto">
          <BaseInput v-model="form.contactName" placeholder="Nombre del contacto" />
        </BaseField>
        <BaseField label="Teléfono">
          <BaseInput v-model="form.phone" placeholder="3001234567" />
        </BaseField>
        <BaseField label="Correo" :error="submitted ? (emailError ?? undefined) : undefined">
          <BaseInput
            v-model="form.email"
            placeholder="ventas@proveedor.com"
            :invalid="submitted && !!emailError"
          />
        </BaseField>
        <BaseField label="Dirección">
          <BaseInput v-model="form.address" placeholder="Cra 1 # 2-3" />
        </BaseField>
        <BaseField class="col-2" label="Notas" hint="Opcional">
          <BaseTextarea v-model="form.notes" placeholder="Condiciones, observaciones…" :rows="2" />
        </BaseField>
      </div>
    </template>
    <template #footer-actions>
      <button type="button" class="btn ghost" @click="emit('close')">Cancelar</button>
      <button type="button" class="btn primary" :disabled="saving" @click="submit">
        {{ saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear proveedor' }}
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px 20px;
}

.col-2 {
  grid-column: 1 / -1;
}

@media (width <= 640px) {
  .grid {
    grid-template-columns: 1fr;
  }
}

.server-error {
  margin: 0 0 14px;
  padding: 10px 12px;
  border-radius: 8px;
  background: oklch(94% 0.06 25deg);
  color: oklch(45% 0.18 25deg);
  font-size: 13px;
}

.btn {
  border: none;
  border-radius: 9px;
  padding: 9px 16px;
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
}

.btn.ghost {
  background: var(--warm-100);
  color: var(--warm-700);
}

.btn.primary {
  background: var(--amatista-600, #5c2d8c);
  color: #fff;
}

.btn.primary:disabled {
  opacity: 0.6;
  cursor: default;
}
</style>
