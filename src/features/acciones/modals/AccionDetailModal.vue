<script setup lang="ts">
import type { FunctionalComponent } from 'vue'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
import DetailField from '@/features/historia-clinica/components/DetailField.vue'

export interface DetailFieldDef {
  label: string
  value: string | number | null | undefined
  span?: 1 | 2 | 'full'
}

defineProps<{
  open: boolean
  title: string
  subtitle?: string
  icon?: FunctionalComponent
  fields: DetailFieldDef[]
  canEdit?: boolean
}>()

const emit = defineEmits<{ close: []; edit: [] }>()
</script>

<template>
  <ModalShell
    :open="open"
    :title="title"
    :subtitle="subtitle"
    :icon="icon"
    :width="640"
    @close="emit('close')"
  >
    <template #body>
      <div class="detail-grid">
        <DetailField
          v-for="(f, idx) in fields"
          :key="idx"
          :label="f.label"
          :value="f.value as string | number | null"
          :span="f.span"
        />
      </div>
      <!-- Contenido extra bajo los campos (p. ej. adjuntos de resultado). -->
      <slot />
    </template>

    <template #footer-actions>
      <button type="button" class="btn-ghost" @click="emit('close')">Cerrar</button>
      <button
        v-if="canEdit"
        type="button"
        class="btn-primary"
        @click="emit('edit')"
      >
        Editar
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px 24px;
}
@media (max-width: 560px) { .detail-grid { grid-template-columns: 1fr; } }
.btn-ghost, .btn-primary {
  font-family: inherit; font-size: 13px; font-weight: 500;
  padding: 8px 14px; border-radius: 9px; cursor: pointer;
  border: 1px solid transparent;
}
.btn-ghost { background: transparent; border-color: var(--warm-200); color: var(--warm-700); }
.btn-ghost:hover { background: var(--warm-100); }
.btn-primary { background: var(--amatista-700); color: white; }
.btn-primary:hover { filter: brightness(1.05); }
</style>
