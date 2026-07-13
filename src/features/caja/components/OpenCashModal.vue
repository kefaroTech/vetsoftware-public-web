<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Wallet } from 'lucide-vue-next'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
import BaseField from '@/features/dashboard/components/ui/BaseField.vue'
import BaseInput from '@/features/dashboard/components/ui/BaseInput.vue'
import BaseTextarea from '@/features/dashboard/components/ui/BaseTextarea.vue'
import { useBranchStore } from '@/features/branches/stores/branch.store'
import { useCaja } from '../composables/useCaja'
import { getProblemDetailMessage } from '@/services/http/http.client'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: []; saved: [] }>()

const { open: openCaja } = useCaja()
const branchStore = useBranchStore()

const openingFloat = ref('')
const terminal = ref('')
const note = ref('')
const submitted = ref(false)
const saving = ref(false)
const serverError = ref<string | null>(null)

const branchId = computed(() => branchStore.selectedBranchId)
const floatValue = computed(() => Number(openingFloat.value.replace(',', '.')))
const floatError = computed(() =>
  openingFloat.value.trim() === '' || Number.isNaN(floatValue.value) || floatValue.value < 0
    ? 'Ingresa una base válida (0 o más).'
    : null,
)

watch(
  () => props.open,
  (o) => {
    if (o) {
      openingFloat.value = ''
      terminal.value = ''
      note.value = ''
      submitted.value = false
      serverError.value = null
    }
  },
)

async function submit() {
  submitted.value = true
  serverError.value = null
  if (floatError.value) return
  if (branchId.value == null) {
    serverError.value = 'Selecciona una sede en el selector superior antes de abrir la caja.'
    return
  }
  saving.value = true
  try {
    await openCaja({
      branchId: branchId.value,
      openingFloat: floatValue.value,
      terminal: terminal.value.trim() || null,
      note: note.value.trim() || null,
    })
    emit('saved')
    emit('close')
  } catch (e) {
    serverError.value = getProblemDetailMessage(e, 'No se pudo abrir la caja')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <ModalShell
    :open="open"
    title="Abrir caja"
    subtitle="Registra la base inicial para comenzar a cobrar"
    :icon="Wallet"
    :width="520"
    compact
    @close="emit('close')"
  >
    <template #body>
      <p v-if="serverError" class="server-error">{{ serverError }}</p>
      <div class="grid">
        <BaseField label="Base inicial (efectivo)" required :error="submitted ? floatError ?? undefined : undefined">
          <BaseInput
            v-model="openingFloat"
            placeholder="0"
            inputmode="decimal"
            suffix="COP"
            :invalid="submitted && !!floatError"
          />
        </BaseField>
        <BaseField label="Terminal" hint="Opcional. Por defecto: principal">
          <BaseInput v-model="terminal" placeholder="principal" />
        </BaseField>
        <BaseField label="Nota" hint="Opcional">
          <BaseTextarea v-model="note" placeholder="Observaciones de apertura…" :rows="2" />
        </BaseField>
      </div>
    </template>
    <template #footer-actions>
      <button type="button" class="btn ghost" @click="emit('close')">Cancelar</button>
      <button type="button" class="btn primary" :disabled="saving" @click="submit">
        {{ saving ? 'Abriendo…' : 'Abrir caja' }}
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
.grid {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.server-error {
  margin: 0 0 14px;
  padding: 10px 12px;
  border-radius: 8px;
  background: oklch(94% 0.06 25);
  color: oklch(45% 0.18 25);
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
