<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { LogOut } from 'lucide-vue-next'
import ModalShell from '@/components/ui/ModalShell.vue'
import BaseField from '@/components/ui/BaseField.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import type { ReasonLeaving } from '@/types/domain'

const props = defineProps<{
  open: boolean
  patientName: string
  /**
   * FORM-10 — lo controla el padre mientras la mutación está en vuelo. Opcional:
   * sin pasarlo el diálogo se protege igual con su propia bandera (`emitted`).
   */
  saving?: boolean
}>()
const emit = defineEmits<{ confirm: [reason: ReasonLeaving]; close: [] }>()

const reasonOptions = [
  { value: 'MEDICAL_DISCHARGE', label: 'Alta médica' },
  { value: 'HOME_TREATMENT', label: 'Tratamiento en casa' },
  { value: 'TRANSFER', label: 'Traslado' },
  { value: 'TUTOR_WISH', label: 'Decisión del tutor' },
  { value: 'ADMIN', label: 'Administrativa' },
  { value: 'DEATH', label: 'Muerte' },
  { value: 'EUTHANASIA', label: 'Eutanasia' },
]

const reason = ref<ReasonLeaving>('MEDICAL_DISCHARGE')

/**
 * FORM-10 — guarda de reenvío. El botón emitía `confirm` directamente en el
 * marcado y seguía activo hasta que el padre cerrara el diálogo: dos
 * pulsaciones son dos altas sobre la misma hospitalización. La bandera baja al
 * reabrir.
 */
const emitted = ref(false)
const busy = computed(() => props.saving === true || emitted.value)

watch(
  () => props.open,
  (open) => {
    if (open) {
      reason.value = 'MEDICAL_DISCHARGE'
      emitted.value = false
    }
  },
)

function confirm() {
  if (busy.value) return
  emitted.value = true
  emit('confirm', reason.value)
}
</script>

<template>
  <ModalShell
    :open="open"
    :icon="LogOut"
    accent="warn"
    title="Dar de alta"
    :subtitle="`Se cerrará la hospitalización de ${patientName} y saldrá del tablero.`"
    :width="520"
    @close="emit('close')"
  >
    <template #body>
      <BaseField label="Motivo del alta">
        <template #default="{ id }">
          <BaseSelect :id="id" v-model="reason" :options="reasonOptions" />
        </template>
      </BaseField>
      <p class="hint">
        El registro queda en la historia clínica del paciente con su fecha de alta.
      </p>
    </template>

    <template #footer-actions>
      <button type="button" class="ds-btn ds-btn--ghost" @click="emit('close')">Cancelar</button>
      <button type="button" class="ds-btn ds-btn--solid" :disabled="busy" @click="confirm">
        {{ busy ? 'Dando de alta…' : 'Confirmar alta' }}
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
.hint {
  margin: 12px 0 0;
  font-size: 12.5px;
  color: var(--warm-500);
  line-height: 1.5;
}

/* Acción de aviso: ámbar en lugar del amatista por defecto. */
.ds-btn--solid {
  --ds-btn-solid-bg: oklch(55% 0.16 80deg);
}
</style>
