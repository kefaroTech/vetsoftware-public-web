<script setup lang="ts">
/**
 * Desplegable de filtro de la tienda (`.fsel`): borde suave, chevron pintado en
 * el fondo y foco amatista. Estaba copiado en `InventarioView`,
 * `InventoryProductsTable`, `ServiciosView` y `CountSheetModal` — el mismo
 * `background-image` en línea, cuatro veces.
 *
 * Las opciones llegan por slot: lo que se repetía era el control, no la lista.
 */
withDefaults(
  defineProps<{
    /** `md` = métrica de pantalla (10/14, 13.5px); `sm` = de modal (9/13, 13px). */
    size?: 'sm' | 'md'
  }>(),
  { size: 'md' },
)

const model = defineModel<string>({ required: true })
</script>

<template>
  <select
    v-model="model"
    class="fsel ds-focus-ring ds-focus-ring--no-outline"
    :class="`fsel--${size}`"
  >
    <slot />
  </select>
</template>

<style scoped>
/* El orden importa: `background` (atajo) limpia la imagen, así que el chevron
   se declara después. Era así en las cuatro copias. */
.fsel {
  appearance: none;
  border: 1px solid var(--warm-200);
  background: var(--warm-50);
  border-radius: 9px;
  font-family: inherit;
  color: var(--warm-800);
  cursor: pointer;
  background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' stroke='%23999' stroke-width='1.5' viewBox='0 0 24 24'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 11px center;
}
.fsel--md {
  padding: 10px 30px 10px 14px;
  font-size: 13.5px;
}
.fsel--sm {
  padding: 9px 30px 9px 13px;
  font-size: 13px;
}

/* El anillo de foco es `.ds-focus-ring ds-focus-ring--no-outline`
   (primitives.css): el `box-shadow` y el `outline: none` los pone la primitiva
   y sus reglas locales se borraron. El `border-color` NO puede irse: la
   primitiva pesa (0,2,0) exactamente lo mismo que `.fsel[data-v]`, que declara
   el atajo `border`, y el desempate lo decidiría el orden del bundle. Con la
   regla aquí gana siempre — es el mismo motivo por el que `InventarioView`
   repite este `:focus` para su variante `.fsel.branch`. */
.fsel:focus {
  border-color: var(--amatista-500);
}
</style>
