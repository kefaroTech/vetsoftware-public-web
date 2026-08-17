<script setup lang="ts">
/**
 * Acción terciaria con aspecto de enlace (amatista, sin caja, subrayado al
 * pasar el ratón). Dos copias: el "Historial" de la hoja de conteo y el "Volver
 * al historial" de su detalle.
 *
 * No es `.ds-btn--plain`: aquella es gris y con caja al pasar el ratón; esta va
 * en color de marca y se subraya.
 */
</script>

<template>
  <button type="button" class="link-btn">
    <slot />
  </button>
</template>

<style scoped>
.link-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: none;
  color: var(--amatista-700);
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  padding: 0;
}
.link-btn:hover {
  text-decoration: underline;
}
</style>
