<script setup lang="ts">
import { Trash2, TriangleAlert } from 'lucide-vue-next'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'

withDefaults(
  defineProps<{
    open: boolean
    title: string
    message?: string
    actionLabel?: string
    busy?: boolean
  }>(),
  {
    message: 'Esta acción no se puede deshacer. ¿Deseas continuar?',
    actionLabel: 'Eliminar',
    busy: false,
  },
)

const emit = defineEmits<{
  cancel: []
  confirm: []
}>()
</script>

<template>
  <ModalShell
    :open="open"
    :title="title"
    :icon="TriangleAlert"
    accent="danger"
    compact
    :width="440"
    @close="emit('cancel')"
  >
    <template #body>
      <p class="msg">{{ message }}</p>
    </template>

    <template #footer-actions>
      <button type="button" class="ghost" :disabled="busy" @click="emit('cancel')">Cancelar</button>
      <button type="button" class="danger" :disabled="busy" @click="emit('confirm')">
        <Trash2 :size="14" :stroke-width="1.7" />
        {{ actionLabel }}
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

.ghost,
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
  border: 1px solid transparent;
}

.ghost {
  background: var(--warm-50);
  color: var(--warm-700);
  border-color: var(--warm-200);
}

.ghost:hover:not(:disabled) {
  background: var(--warm-100);
}

.danger {
  background: oklch(94% 0.05 25deg);
  color: oklch(48% 0.18 25deg);
  border-color: oklch(48% 0.18 25deg);
}

.danger:hover:not(:disabled) {
  background: oklch(91% 0.07 25deg);
}

.ghost:disabled,
.danger:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
</style>
