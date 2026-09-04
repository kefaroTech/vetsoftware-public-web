<script setup lang="ts">
/**
 * Tabla de listado de `compras`.
 *
 * El mismo `.grid-table` + `th` + `td` estaba copiado byte a byte en las tres
 * vistas de la feature (`ProveedoresView`, `OrdenesRecepcionesView`,
 * `FacturasProveedorView`), y su cuerpo base era uno de los que el presupuesto
 * de CSS contaba repetido en más de tres componentes.
 *
 * NO es `.ds-table` de primitives.css: aquélla es la firma de "pantalla" (13px,
 * radio 12, celda 11/14, cabecera con fondo y semibold). Ésta es la de compras
 * —sin marco propio, cabecera de 10,5px en versalitas y celda de 9×8— y
 * unificarlas cambiaría el aspecto de tres pantallas.
 *
 * Las filas llegan por el slot, así que llevan el ámbito del PADRE, no el de
 * este componente: por eso `th`/`td` se alcanzan con `:deep()`. El peso resulta
 * el mismo que tenían (`.grid-table[data-v] th` → (0,2,1)), de modo que las
 * reglas más específicas del padre (`.grid-table tfoot td`, `.actions-col`)
 * siguen ganando igual que antes.
 */
</script>

<template>
  <table class="grid-table">
    <slot />
  </table>
</template>

<style scoped>
.grid-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.grid-table :deep(th) {
  text-align: left;
  color: var(--warm-500);
  font-size: 10.5px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 8px;
  border-bottom: 1px solid var(--warm-200);
}

/* `.grid-table :deep(th)` (0,2,1) le gana a `.ds-num` (0,1,0), así que la
   cabecera de una columna de dinero quedaba a la izquierda sobre cifras
   alineadas a la derecha. La excepción nombra la clase para pesar (0,2,2). */
.grid-table :deep(th.ds-num) {
  text-align: right;
}

.grid-table :deep(td) {
  padding: 9px 8px;
  border-bottom: 1px solid var(--warm-100);
  color: var(--warm-700);
}
</style>
