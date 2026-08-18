<script setup lang="ts">
/**
 * Estado vacío ilustrado del paso 1: icono en caja, titular, texto de apoyo y
 * una acción.
 *
 * Existe antes que ninguna otra extracción del paso porque el buscador de
 * propietario y la lista de mascotas comparten estas cuatro reglas byte a byte.
 * Partir el paso sin sacar esto primero habría duplicado el CSS en los dos
 * trozos, que es justo lo contrario de lo que persigue FE-08.
 *
 * OJO: la clase del elemento raíz se llama `empty` a propósito. `PasoPaciente`
 * agita el área seleccionable con `.pet-section.pet-shake :is(.grid, .empty,
 * .add-pet)`, y ese selector alcanza este componente porque Vue estampa el
 * atributo de scope del padre en la raíz del hijo. Si se renombra aquí, hay que
 * renombrarlo también allí.
 */
import type { Component } from 'vue'

withDefaults(
  defineProps<{
    icon: Component
    title: string
    iconSize?: number
    iconStroke?: number
  }>(),
  { iconSize: 26, iconStroke: 1.6 },
)
</script>

<template>
  <div class="empty">
    <div class="empty-ic ds-tone--accent-soft">
      <component :is="icon" :size="iconSize" :stroke-width="iconStroke" />
    </div>
    <div class="empty-title ds-text-strong">{{ title }}</div>
    <p class="empty-desc ds-meta-dark"><slot name="description" /></p>
    <slot name="action" />
  </div>
</template>

<style scoped>
.empty {
  padding: 40px 20px;
  text-align: center;
}

/* El par fondo+texto lo pone `.ds-tone--accent-soft`. */
.empty-ic {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  margin: 0 auto 14px;
}

/* Residuo sobre `.ds-text-strong` (warm-900 / peso medio). */
.empty-title {
  font-size: 15px;
  margin-bottom: 4px;
}

/* Residuo sobre `.ds-meta-dark` (warm-600 / 13px). */
.empty-desc {
  margin: 0 auto 18px;
  max-width: 380px;
  line-height: 1.55;
}
</style>
