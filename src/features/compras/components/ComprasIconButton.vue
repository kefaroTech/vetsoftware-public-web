<script setup lang="ts">
/**
 * Botón de icono RELLENO de `compras`.
 *
 * Estaba copiado byte a byte en las cinco pantallas de la feature —los dos
 * modales de línea (`PurchaseOrderModal`, `GoodsReceiptModal`) y las tres vistas
 * de listado (`ProveedoresView`, `OrdenesRecepcionesView`,
 * `FacturasProveedorView`)—, y con él sus tonos de hover. El de peligro era uno
 * de los cuerpos que el presupuesto de CSS contaba repetido en 5 componentes.
 *
 * NO es `.ds-icon-btn` de primitives.css: aquella es la familia de CONTORNO,
 * cuadrada de 28×28. Ésta es rellena y se dimensiona por padding, y unificarlas
 * cambiaría el aspecto de cinco pantallas — que es justo lo que la capa de
 * primitivas evita. Por eso la pieza se comparte aquí, dentro de la feature.
 *
 * Los atributos no declarados (`title`, `disabled`, `@click`…) caen al `<button>`
 * por el paso de atributos de Vue.
 */
withDefaults(
  defineProps<{
    /** El tono sólo tiñe el `:hover`; en reposo los tres son iguales. */
    tone?: 'neutral' | 'danger' | 'success'
    /**
     * `true` en las filas de tabla de las vistas (padding 6px + `inline-flex` +
     * hover neutro); `false` en los modales de línea (padding 8px, sin hover
     * neutro y sin `display` propio, que allí es un ítem de rejilla).
     */
    row?: boolean
  }>(),
  { tone: 'neutral', row: false },
)
</script>

<template>
  <button
    type="button"
    class="icon-btn"
    :class="[
      row && 'icon-btn--row',
      tone === 'danger' && 'icon-btn--danger',
      tone === 'success' && 'icon-btn--success',
    ]"
  >
    <slot />
  </button>
</template>

<style scoped>
.icon-btn {
  border: none;
  background: var(--warm-100);
  color: var(--warm-600);
  border-radius: 7px;
  padding: 8px;
  cursor: pointer;
}

.icon-btn--row {
  padding: 6px;
  display: inline-flex;
}

/* El hover neutro sólo existía en las tres vistas de listado. */
.icon-btn--row:hover {
  background: var(--warm-200);
}

/* Los tonos van después del hover neutro para pisarlo, igual que en el orden
   original de las hojas que sustituyen.

   El verde de "acción positiva" de `compras` es `--compras-ok-bg`/`-fg`
   (tokens.css, auditoría FE-08 fase final) — antes vivía suelto, con el
   mismo valor byte a byte, en `CashStatusPill` (caja) y en las píldoras de
   estado de las dos vistas que usan este botón.

   Las dos reglas de abajo repiten el cuerpo de `.ds-tone--compras-ok` y
   `.ds-tone--danger`, y NO pueden consumirlas. Dos motivos, los dos
   estructurales:

   1. Esas dos primitivas existen sólo en forma PLANA — no hay
      `.ds-tone--compras-ok:hover` ni `.ds-tone--danger:hover` en
      primitives.css, a diferencia de `.ds-tone--accent-border` o
      `.ds-tone--neutral-soft`, que sí tienen su pareja `:hover`. Colgar la
      clase plana del `<button>` teñiría el botón EN REPOSO, y el contrato de
      este componente es justo el contrario: «el tono sólo tiñe el `:hover`;
      en reposo los tres son iguales» (ver la prop `tone`).
   2. La forma `:hover` de esta familia lleva siempre `:not(:disabled)`. Aquí
      el `:hover` es desnudo a propósito: `disabled` entra por el paso de
      atributos de Vue y las vistas de listado lo usan, así que añadir el
      guardián apagaría un hover que hoy sí se pinta — cambio de
      comportamiento, no refactor. */
/* stylelint-disable-next-line vetsoftware/no-duplicate-primitive -- `.ds-tone--compras-ok` sólo existe en forma plana: colgarla del botón lo teñiría en reposo, y aquí el tono es exclusivo del `:hover`. Su forma `:hover` tampoco serviría tal cual: la familia la declara con `:not(:disabled)` y este `:hover` es desnudo a propósito (`disabled` llega por paso de atributos), así que el guardián cambiaría comportamiento. */
.icon-btn--success:hover {
  background: var(--compras-ok-bg);
  color: var(--compras-ok-fg);
}

/* stylelint-disable-next-line vetsoftware/no-duplicate-primitive -- `.ds-tone--danger` sólo existe en forma plana: colgarla del botón lo teñiría en reposo, y aquí el tono es exclusivo del `:hover`. La primitiva de icono que sí es `:hover` (`.ds-icon-btn--danger`) es otra pieza y otros valores (danger-100/900/400 frente a danger-200 + oklch(50% 0.2 25deg)): adoptarla cambiaría el color de cinco pantallas. */
.icon-btn--danger:hover {
  background: var(--danger-200);
  color: oklch(50% 0.2 25deg);
}
</style>
