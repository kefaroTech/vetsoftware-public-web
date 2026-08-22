<script setup lang="ts">
import { panelId, tabId } from './tabs'

/**
 * El panel de un juego de `BaseTabs`. Va SUELTO, donde el contenido tenga que
 * estar: no es un slot de la tira, y por eso `ReportesView` puede dejar la tira
 * dentro de la fila de filtros y el panel fuera (issue #186).
 *
 * `name` es el mismo que recibe la tira y `value` el de la pestaña que pinta
 * este panel; de ahí salen su `id` y su `aria-labelledby`, y de ahí sale el
 * `aria-controls` de la pestaña seleccionada. Ver `tabs.ts`.
 *
 * `tabindex="0"` siempre, y no solo cuando el panel no tiene nada enfocable
 * dentro: es la recomendación del APG, garantiza que el panel sea alcanzable
 * desde la tira con un solo Tab, y evita que cada anfitrión tenga que decidirlo
 * —el contenido de estos paneles cambia (una tabla no lleva foco, una lista de
 * cajas sí) y esa decisión no puede depender de lo que haya cargado.
 *
 * Sin `<style>`: la caja la trae el anfitrión por `class`, que Vue funde sobre
 * esta raíz. `ReportesView` le pasa `ds-stack ds-stack--18` para conservar
 * exactamente el hueco que le daba `.ds-page--stack` cuando su contenido colgaba
 * directamente de la página.
 */
defineProps<{ name: string; value: string }>()
</script>

<template>
  <section
    :id="panelId(name, value)"
    role="tabpanel"
    :aria-labelledby="tabId(name, value)"
    tabindex="0"
  >
    <slot />
  </section>
</template>
