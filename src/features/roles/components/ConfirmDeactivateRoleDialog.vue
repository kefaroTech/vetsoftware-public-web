<script setup lang="ts">
import { TriangleAlert, Power } from 'lucide-vue-next'
import type { RoleResponse } from '../types'
import ModalShell from '@/components/ui/ModalShell.vue'

defineProps<{
  open: boolean
  role: RoleResponse | null
  busy?: boolean
}>()

const emit = defineEmits<{
  cancel: []
  confirm: []
}>()
</script>

<template>
  <ModalShell
    :open="open"
    :title="role ? `¿Desactivar ${role.name}?` : '¿Desactivar rol?'"
    :icon="TriangleAlert"
    accent="danger"
    compact
    :width="460"
    @close="emit('cancel')"
  >
    <template #body>
      <p class="msg">
        Los empleados con este rol dejarán de tener los permisos asociados hasta que vuelvas a
        activarlo. La configuración del rol y sus permisos se mantienen intactos.
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

/* El botón de cancelar usa `.ds-btn` (primitives.css). Este destructivo se
   queda local: lleva el borde del mismo tono que el texto, más marcado que el
   `--danger` del sistema. */
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

  /* Sin token: este 0.05 de croma no coincide con ninguno de la escala. */
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
