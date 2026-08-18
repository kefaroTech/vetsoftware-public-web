<script setup lang="ts">
import { Search } from 'lucide-vue-next'

/**
 * Caja de búsqueda de la tienda: contenedor con borde, lupa atenuada e input
 * transparente que ocupa el resto.
 *
 * Estaba copiada con el mismo marcado en cuatro sitios (`PosCatalog`,
 * `InventoryProductsTable`, `ServiciosView` y `CountSheetModal`): mismo
 * `:focus-within`, mismo icono `warm-500` que no encoge y mismo input sin borde.
 * Solo variaban dos métricas, que aquí son los modificadores.
 *
 * El `:focus-within` usa `.ds-focus-ring` (primitives.css) para el `box-shadow`,
 * pero conserva el `border-color` en una regla local de una sola declaración:
 * la regla base de este componente declara el atajo `border`, que en CSS scoped
 * pesa lo mismo (0,2,0) que la primitiva, y ese empate lo decidiría el orden del
 * bundle. Con la regla local (0,3,0) el borde amatista gana siempre.
 */
withDefaults(
  defineProps<{
    placeholder?: string
    /** Crece dentro de la barra de filtros hasta su tope (`fsel` al lado). */
    fill?: boolean
    /** `md` = métrica de pantalla (10/13, 13.5px); `sm` = de modal (9/12, 13px). */
    size?: 'sm' | 'md'
  }>(),
  { placeholder: '', fill: false, size: 'md' },
)

const model = defineModel<string>({ required: true })
</script>

<template>
  <div class="search ds-focus-ring" :class="[`search--${size}`, { 'search--fill': fill }]">
    <Search :size="15" :stroke-width="1.7" class="ds-icon-muted" />
    <input v-model="model" type="search" :placeholder="placeholder" class="ds-flex-fill" />
  </div>
</template>

<style scoped>
/* La raíz lleva el `data-v` del padre además del propio, así que las vistas
   siguen pudiendo ajustar su ancho en un `@media` con `.search { … }`. */
.search {
  display: flex;
  align-items: center;
  gap: 9px;
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 9px;
}
.search--md {
  padding: 10px 13px;
}
.search--sm {
  padding: 9px 12px;
}
.search--fill {
  flex: 1;
  max-width: 340px;
}
.search--sm.search--fill {
  max-width: 320px;
}

/* El `box-shadow` lo pone `.ds-focus-ring` (primitives.css); aquí sólo queda el
   `border-color`, por el empate de peso que explica la cabecera del archivo. */
.search:focus-within {
  border-color: var(--amatista-500);
}
.search input {
  border: none;
  outline: none;
  background: transparent;
  font-family: inherit;
  color: var(--warm-900);
}
.search--md input {
  font-size: 13.5px;
}
.search--sm input {
  font-size: 13px;
}
</style>
