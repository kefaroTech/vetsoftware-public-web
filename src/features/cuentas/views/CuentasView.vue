<script setup lang="ts">
/**
 * Contenedor de Cuentas. Solo aporta la caja de página: el listado y el detalle
 * son dos rutas hijas (`cuentas` y `cuentas-detalle`), no dos ramas de un `v-if`
 * sobre un `ref`.
 *
 * EST-08: la cuenta seleccionada vivía en `const selected = ref(...)` dentro de
 * esta misma vista. Con eso, «atrás» no volvía al listado —salía de Cuentas
 * entero—, un F5 en mitad de un cobro devolvía al tablero, y el enlace de una
 * cuenta no se podía pasar a un compañero. El troceo copia el patrón de
 * `consulta/historial` (`router/index.ts`), que ya lo hacía bien.
 */
</script>

<template>
  <div class="ds-page">
    <RouterView />
  </div>
</template>
