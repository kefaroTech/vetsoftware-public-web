<script setup lang="ts">
import type { FunctionalComponent } from 'vue'
import ModalShell from '@/components/ui/ModalShell.vue'
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
      <div class="detail-grid ds-detail-grid">
        <DetailField
          v-for="f in fields"
          :key="f.label"
          :label="f.label"
          :value="f.value"
          :span="f.span"
        />
      </div>
      <!-- Contenido extra bajo los campos (p. ej. adjuntos de resultado). -->
      <slot />
    </template>

    <template #footer-actions>
      <button type="button" class="ds-btn ds-btn--ghost ds-btn--snug" @click="emit('close')">
        Cerrar
      </button>
      <button
        v-if="canEdit"
        type="button"
        class="ds-btn ds-btn--solid ds-btn--snug"
        @click="emit('edit')"
      >
        Editar
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
/* Único añadido sobre `.ds-detail-grid`: esta ficha abre más la fila. */
.detail-grid {
  row-gap: 18px;
}
</style>
