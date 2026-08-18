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
      :class="{ 'ds-is-disabled': disabled }"
      :disabled="disabled"
      @click="emit('export', 'csv')"
    >
      CSV
    </button>
    <button
      type="button"
      class="exp ds-hover-accent"
      :class="{ 'ds-is-disabled': disabled }"
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
}

/* El estado apagado es `.ds-is-disabled` (primitives.css, opacidad 0.5). La
   regla local se borró en vez de dejarla competir, que es el contrato de esa
   primitiva. El `cursor` se acota al botón activo porque `.ds-is-disabled`
   pesa (0,1,0) y un `.exp[data-v]` (0,2,0) con `pointer` le ganaría el
   `cursor: not-allowed`. */
.exp:not(:disabled) {
  cursor: pointer;
}
</style>
