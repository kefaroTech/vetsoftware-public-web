<script setup lang="ts">
/**
 * Franja "Descargar · CSV · PDF" del kardex y del libro de compras. Dos copias
 * con el mismo marcado y el mismo par de botones; solo cambiaba la etiqueta.
 */
defineProps<{ label: string; disabled?: boolean }>()

const emit = defineEmits<{ export: [format: 'csv' | 'pdf'] }>()
</script>

<template>
  <div class="exportbar ds-flex-row">
    <span class="exp-lbl ds-hint">{{ label }}</span>
    <button
      type="button"
      class="exp ds-hover-accent"
      :disabled="disabled"
      @click="emit('export', 'csv')"
    >
      CSV
    </button>
    <button
      type="button"
      class="exp ds-hover-accent"
      :disabled="disabled"
      @click="emit('export', 'pdf')"
    >
      PDF
    </button>
  </div>
</template>

<style scoped>
.exportbar {
  margin-bottom: 10px;
}
.exp-lbl {
  margin-right: 2px;
}

/* Botón de contorno que se tiñe de amatista al pasar el ratón. El hover ES
   `.ds-hover-accent` (primitives.css), la hermana de `.ds-icon-btn--accent`
   creada justo para los botones de TEXTO como éste: coincide en las tres
   declaraciones y la regla local se borró. La geometría sigue siendo local
   porque `.ds-btn` la fija en 9/16 y aquí es 5/12. */
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
.exp:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
