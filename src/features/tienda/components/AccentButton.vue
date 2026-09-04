<script setup lang="ts">
/**
 * Botón secundario en tono amatista suave (fondo `amatista-50`, borde
 * `amatista-200`, texto `amatista-700`, hover `amatista-100`).
 *
 * Cuatro copias con la misma firma de color: los tres "Reactivar" de servicios,
 * impuestos y productos pausados, y el "Nueva categoría" del gestor de
 * categorías, que es el mismo botón un punto más grande.
 *
 * La colocación (`align-self`, `margin`) se queda en el anfitrión: es layout,
 * no piel.
 */
withDefaults(
  defineProps<{
    /** `sm` = acción de fila (6/12, 12.5px); `md` = acción de cabecera (9/14, 13px). */
    size?: 'sm' | 'md'
  }>(),
  { size: 'sm' },
)
</script>

<template>
  <button type="button" class="acc-btn" :class="`acc-btn--${size}`">
    <slot />
  </button>
</template>

<style scoped>
.acc-btn {
  display: inline-flex;
  align-items: center;
  font-family: inherit;
  font-weight: 500;
  color: var(--amatista-700);
  background: var(--amatista-50);
  border: 1px solid var(--amatista-450);
  cursor: pointer;
}
.acc-btn--sm {
  gap: 6px;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 12.5px;
  white-space: nowrap;
}
.acc-btn--md {
  gap: 8px;
  padding: 9px 14px;
  border-radius: 9px;
  font-size: 13px;
}
.acc-btn:hover {
  background: var(--amatista-100);
}
</style>
