<script setup lang="ts" generic="T extends string">
/**
 * Conmutador segmentado de dos posiciones (Activos/Pausados, Lotes/Movimientos,
 * Entrada/Salida). Estaba copiado en cinco archivos con el mismo marcado y el
 * mismo cuerpo CSS; solo cambiaba el padding horizontal del botón.
 *
 * A11Y · issue #161 — NO es un juego de pestañas y ya no dice serlo. Declaraba
 * `role="tablist"` con hijos que eran `<button>` sin `role="tab"`, lo que
 * incumple `aria-required-children` de axe. Añadir `role="tab"` habría sido la
 * corrección equivocada: revisados los cuatro usos, ninguno conmuta entre
 * paneles hermanos. `ImpuestosView`, `InventarioView` y `ServiciosView` filtran
 * el listado que ya se está mirando (Activos/Pausados) y viven en la fila de
 * acciones de la cabecera, junto a los demás filtros; `StockDetailModal`
 * conmuta una región dentro del cuerpo del modal. El marcado tiene que decir la
 * verdad sobre lo que hace: un grupo de botones de dos estados.
 *
 * De ahí `role="group"` + `aria-pressed` en cada opción (patrón *Button (Toggle)*
 * del APG). `aria-pressed` es el único que expresa «esta posición está puesta»
 * sin prometer un panel que no existe.
 *
 * `NoInfer` en `options` ata el genérico al `modelValue`: así el `@update` sigue
 * devolviendo la unión del padre (`'active' | 'paused'`) y no `string`.
 */
withDefaults(
  defineProps<{
    modelValue: T
    options: readonly { value: NoInfer<T>; label: string }[]
    /** `sm` = 6/12 (cabeceras de vista); `md` = 6/14 (modales). */
    size?: 'sm' | 'md'
    /**
     * Qué conmuta este grupo, p. ej. «Estado de los impuestos». Opcional y no
     * requerido a propósito: `visual/Gallery.vue` y `AdjustModal.vue` montan el
     * componente y no son de esta tarea, así que hacerlo obligatorio rompería la
     * compilación de archivos ajenos. Un `role="group"` sin nombre es válido
     * (a diferencia del `tablist` sin hijos `tab` que había antes); pásalo
     * siempre que puedas, porque sin él el lector solo anuncia los botones
     * sueltos y no lo que tienen en común.
     */
    ariaLabel?: string
  }>(),
  { size: 'sm' },
)

const emit = defineEmits<{ 'update:modelValue': [value: T] }>()
</script>

<template>
  <div class="seg" :class="`seg--${size}`" role="group" :aria-label="ariaLabel">
    <button
      v-for="o in options"
      :key="o.value"
      type="button"
      :class="{ on: modelValue === o.value }"
      :aria-pressed="modelValue === o.value"
      @click="emit('update:modelValue', o.value)"
    >
      {{ o.label }}
    </button>
  </div>
</template>

<style scoped>
/* La raíz conserva el `data-v` del padre: los `@media` que ensanchan el
   conmutador y el `margin`/`align-self` de cada anfitrión siguen viviendo allí. */
.seg {
  display: inline-flex;
  background: var(--warm-100);

  /* A11Y-09 · WCAG 2.2 §1.4.11: este borde es el único límite visible del
     grupo, y lo rodean tres fondos distintos —blanco, el `--warm-50` de la
     página y de los modales, y su propia pista `--warm-100`—. `--warm-200`
     medía ahí 1,27:1, 1,23:1 y 1,16:1; `--warm-450` —el escalón que
     `tokens.css` reserva a bordes de control— da 3,63:1, 3,54:1 y 3,33:1. */
  border: 1px solid var(--warm-450);
  border-radius: 9px;
  padding: 2px;
}
.seg button {
  /* Reserva el sitio del borde que marca la posición puesta: sin él, activar
     un segmento lo ensancharía 2px y el grupo daría un salto al conmutar. */
  border: 1px solid transparent;
  background: transparent;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--warm-600);
  border-radius: 7px;
  cursor: pointer;
}
.seg--sm button {
  padding: 6px 12px;
}
.seg--md button {
  padding: 6px 14px;
}

/* A11Y-09 · WCAG 2.2 §1.4.1 y §1.4.11: el relleno `--warm-50` mide 1,06:1
   sobre la pista `--warm-100` que lo rodea y `--shadow-xs` (8 % de alfa) no
   llega a 3:1, así que la posición puesta se distinguía sólo por el tono del
   rótulo. El peso la comunica sin recurrir al color; el borde `--warm-450` le
   da 3,33:1 contra la pista y 3,54:1 contra su propio relleno. */
.seg button.on {
  background: var(--warm-50);
  border-color: var(--warm-450);
  color: var(--amatista-700);
  font-weight: var(--weight-semibold);
  box-shadow: var(--shadow-xs);
}
</style>
