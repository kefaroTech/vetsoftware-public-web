<script setup lang="ts">
/**
 * Armazón de las tablas de caja: contenedor con scroll horizontal + `<table>`
 * con la cabecera, los bordes de fila y las celdas numéricas del feature.
 *
 * Las tres tablas de caja (historial, cajas abiertas y movimientos) repetían
 * este mismo CSS carácter por carácter, con el comentario "copiado de CajaView"
 * al lado: el CSS scoped no cruza la frontera del componente, pero un componente
 * sí. Las columnas las pone cada consumidor por el slot; lo único que cambia
 * entre ellas es el ancho mínimo, que va por prop.
 *
 * Las reglas van con `:deep()` porque el contenido del slot pertenece al ámbito
 * del padre. La forma de cada selector replica la de las copias que sustituye
 * —`.movs th` gana a `.num`, `.movs td` gana a `.empty-row`— para que el
 * resultado en pantalla sea el mismo, incluidos sus empates de especificidad.
 */
defineProps<{ minWidth: number }>()
</script>

<template>
  <div class="table-scroll">
    <table class="movs" :style="{ minWidth: minWidth + 'px' }">
      <slot />
    </table>
  </div>
</template>

<style scoped>
.table-scroll {
  width: 100%;
  overflow-x: auto;
  scrollbar-width: thin;
}

.movs {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-body);
}

.movs :deep(th) {
  padding: var(--space-6) var(--space-8);
  border-bottom: 1px solid var(--warm-200);
  color: var(--warm-500);
  font-size: var(--text-2xs);
  letter-spacing: 0.04em;
  text-align: left;
  text-transform: uppercase;
}

.movs :deep(td) {
  padding: var(--space-7) var(--space-8);
  border-bottom: 1px solid var(--warm-100);
}

/* La cifra ya no se declara aquí: las tres tablas de caja marcan sus celdas con
   `.ds-num` (primitives.css), que es ese mismo par. El reparto de pesos no
   cambia — `.movs :deep(th)` (0,2,1) le sigue ganando en los encabezados, que
   por eso siguen alineados a la izquierda, y en las celdas no compite nadie. */

:deep(.empty-row) {
  padding: var(--space-22);
  color: var(--warm-400);
  text-align: center;
}

/* Modificadores de celda de las tablas de sesiones (historial y cajas
   abiertas), que también estaban duplicados entre las dos. */
:deep(.branch-name) {
  color: var(--warm-800);
  font-weight: var(--weight-semibold);
  white-space: nowrap;
}

:deep(.duration) {
  color: var(--warm-600);
  font-variant-numeric: tabular-nums;
}

:deep(.employee) {
  color: var(--warm-600);
  font-size: var(--text-xs);
}
</style>
