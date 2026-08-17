<script setup lang="ts">
import { TriangleAlert } from 'lucide-vue-next'

defineProps<{ open: boolean; petName: string }>()
defineEmits<{ confirm: []; cancel: [] }>()
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="ds-dialog-overlay overlay" role="alertdialog" aria-modal="true">
      <div class="ds-dialog-card">
        <div class="ds-dialog-icon icon">
          <TriangleAlert :size="22" :stroke-width="1.8" />
        </div>
        <h2 class="ds-title">¿Crear consulta para una mascota fallecida?</h2>
        <p class="ds-dialog-body desc">
          {{ petName }} aparece marcada como fallecida. Esta consulta quedará registrada como
          necropsia o registro post-mortem.
        </p>
        <div class="ds-actions">
          <button type="button" class="ds-btn ds-btn--ghost" @click="$emit('cancel')">
            Cancelar
          </button>
          <button type="button" class="ds-btn ds-btn--solid" @click="$emit('confirm')">
            Continuar
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* Residuo sobre `.ds-dialog-overlay`: el z-index no entra en la primitiva. */
.overlay {
  z-index: 100;
}

/* Tono ámbar a medida: no coincide byte a byte con ningún token de warning,
   así que se queda local sobre `.ds-dialog-icon`. */
.icon {
  background: oklch(94% 0.05 80deg);
  color: oklch(40% 0.12 80deg);
}

/* Residuo sobre `.ds-dialog-body` (el margen difiere entre los 4 diálogos). */
.desc {
  margin: 0 0 22px;
}
</style>
