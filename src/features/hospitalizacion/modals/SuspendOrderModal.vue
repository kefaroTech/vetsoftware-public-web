<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Ban } from 'lucide-vue-next'
import ModalShell from '@/components/ui/ModalShell.vue'
import type { OrderKind } from '../types/hospital'

const props = defineProps<{
  open: boolean
  kind: OrderKind
  name: string
  /**
   * FORM-10 — lo controla el padre mientras la mutación está en vuelo. Opcional:
   * sin pasarlo el modal se protege igual con su propia bandera (`emitted`).
   */
  saving?: boolean
}>()

const emit = defineEmits<{ confirm: []; close: [] }>()

/**
 * FORM-10 — guarda de reenvío. El botón emitía `confirm` sin más y seguía
 * activo hasta que el padre cerrara el modal: dos pulsaciones son dos
 * suspensiones sobre la misma orden. La bandera baja al reabrir.
 */
const emitted = ref(false)
const busy = computed(() => props.saving === true || emitted.value)

watch(
  () => props.open,
  (open) => {
    if (open) emitted.value = false
  },
)

function confirm() {
  if (busy.value) return
  emitted.value = true
  emit('confirm')
}
</script>

<template>
  <ModalShell
    :open="open"
    :icon="Ban"
    accent="warn"
    :title="kind === 'med' ? '¿Suspender medicamento?' : '¿Suspender procedimiento?'"
    :subtitle="name"
    :width="500"
    @close="emit('close')"
  >
    <template #body>
      <p class="lead">Al suspender:</p>
      <ul class="facts ds-stack">
        <li>
          Se eliminan las {{ kind === 'med' ? 'tomas' : 'ejecuciones' }}
          <strong>pendientes</strong> del calendario.
        </li>
        <li>
          Las {{ kind === 'med' ? 'dosis' : 'ejecuciones' }} <strong>ya aplicadas</strong> se
          conservan (registro histórico).
        </li>
        <li>La orden queda marcada como <strong>Suspendida</strong> (no se elimina).</li>
      </ul>
    </template>

    <template #footer-actions>
      <button type="button" class="ds-btn ds-btn--ghost" @click="emit('close')">Cancelar</button>
      <button type="button" class="ds-btn ds-btn--solid" :disabled="busy" @click="confirm">
        {{ busy ? 'Suspendiendo…' : 'Suspender' }}
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
.lead {
  margin: 0 0 10px;
  font-size: 13.5px;
  color: var(--warm-800);
}

.facts {
  margin: 0;
  padding-left: var(--space-18);
  gap: var(--space-6);
  font-size: 12.5px;
  color: var(--warm-700);
  line-height: 1.45;
}

/* Acción de aviso: ámbar en lugar del amatista por defecto. */
.ds-btn--solid {
  --ds-btn-solid-bg: oklch(55% 0.16 80deg);
}
</style>
