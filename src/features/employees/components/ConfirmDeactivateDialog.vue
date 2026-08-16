<script setup lang="ts">
import { computed } from 'vue'
import { TriangleAlert, Power } from 'lucide-vue-next'
import type { Employee } from '@/types/domain'
import ModalShell from '@/components/ui/ModalShell.vue'

const props = defineProps<{
  open: boolean
  employee: Employee | null
  busy?: boolean
}>()

const emit = defineEmits<{
  cancel: []
  confirm: []
}>()

const firstName = computed(() => props.employee?.name.split(' ')[0] ?? '')
</script>

<template>
  <ModalShell
    :open="open"
    :title="employee ? `¿Desactivar a ${firstName}?` : '¿Desactivar empleado?'"
    :icon="TriangleAlert"
    accent="danger"
    compact
    :width="440"
    @close="emit('cancel')"
  >
    <template #body>
      <p class="msg">
        No podrá iniciar sesión hasta que vuelvas a activar su cuenta. Sus consultas y registros
        previos se mantienen intactos.
      </p>
    </template>

    <template #footer-actions>
      <button
        type="button"
        class="ds-btn ds-btn--ghost ds-btn--snug"
        :disabled="busy"
        @click="emit('cancel')"
      >
        Cancelar
      </button>
      <button type="button" class="danger" :disabled="busy" @click="emit('confirm')">
        <Power :size="14" :stroke-width="1.7" />
        Desactivar
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
.msg {
  margin: 0;
  font-size: 13.5px;
  color: var(--warm-600);
  line-height: 1.55;
}

/* El botón de cancelar usa `.ds-btn`; este destructivo se queda local por su
   borde del mismo tono que el texto, más marcado que el `--danger` del sistema. */
.danger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  font-size: 13px;
  border-radius: 7px;
  cursor: pointer;
  font-family: inherit;
  font-weight: 500;
  background: oklch(94% 0.05 25deg);
  color: var(--danger-700);
  border: 1px solid var(--danger-700);
}

.danger:hover:not(:disabled) {
  background: oklch(91% 0.07 25deg);
}

.danger:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
</style>
