<script setup lang="ts">
/**
 * Franja "Descargar · CSV · PDF" del kardex y del libro de compras. Dos copias
 * con el mismo marcado y el mismo par de botones; solo cambiaba la etiqueta.
 */
defineProps<{ label: string; disabled?: boolean }>()

const emit = defineEmits<{ export: [format: 'csv' | 'pdf'] }>()
</script>

<template>
  <div class="exportbar">
    <span class="exp-lbl ds-hint">{{ label }}</span>
    <button type="button" class="exp" :disabled="disabled" @click="emit('export', 'csv')">
      CSV
    </button>
    <button type="button" class="exp" :disabled="disabled" @click="emit('export', 'pdf')">
      PDF
    </button>
  </div>
</template>

<style scoped>
.exportbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}
.exp-lbl {
  margin-right: 2px;
}

/* Botón de contorno que se tiñe de amatista al pasar el ratón. La primitiva
   equivalente (`.ds-icon-btn--accent`) impone la geometría del botón de icono,
   así que aquí el hover sigue siendo local — ver el informe. */
.exp {
  padding: 5px 12px;
  border-radius: 7px;
  border: 1px solid var(--warm-200);
  background: var(--warm-50);
  color: var(--warm-700);
  font-family: inherit;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
}
.exp:hover:not(:disabled) {
  background: var(--amatista-50);
  border-color: var(--amatista-300);
  color: var(--amatista-700);
}
.exp:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
