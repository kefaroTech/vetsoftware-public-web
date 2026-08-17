<script setup lang="ts">
import type { Component } from 'vue'

/**
 * Tarjeta de pestaña de caja: cabecera (título + icono opcional + contador) y
 * cuerpo libre.
 *
 * `CajaHistoryPanel` y `CajaOpenSessionsPanel` la escribían entera cada uno —
 * incluida la clase `.history-count`, idéntica carácter por carácter en los dos
 * (auditoría FE-08). Aquí el contador es ya `.ds-meta` de `primitives.css`.
 *
 * La única diferencia real entre las dos copias era el alto del padding, así que
 * va por prop (`tight`) en vez de fundirse: el panel de cajas abiertas se dibuja
 * 2px más plano y no es un descuido.
 */
defineProps<{
  title: string
  /** Icono Lucide a la izquierda del título. Sin él, el título va solo. */
  icon?: Component
  tight?: boolean
}>()
</script>

<template>
  <section class="ds-card caja-panel" :class="{ 'caja-panel--tight': tight }">
    <div class="caja-panel-head">
      <h2 class="caja-panel-title">
        <component :is="icon" v-if="icon" :size="16" :stroke-width="1.7" />
        {{ title }}
      </h2>
      <span v-if="$slots.count" class="ds-meta"><slot name="count" /></span>
    </div>
    <slot />
  </section>
</template>

<style scoped>
/* `.ds-card` aporta padding, borde, fondo y radio 14px; la caja usa 16px. */
.caja-panel {
  border-radius: var(--radius-xl);
}

.caja-panel--tight {
  padding: var(--space-18) var(--space-22);
}

.caja-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-12);
}

.caja-panel-title {
  display: flex;
  align-items: center;
  gap: var(--space-6);
  margin: var(--space-8) 0 var(--space-10);
  color: var(--warm-800);
  font-family: var(--font-serif);
  font-size: 16px;
  font-weight: var(--weight-normal);
}

/* Después de `--tight` a propósito: en móvil los dos paneles van al mismo
   padding y esta regla debe ganarle al modificador. */
@media (width <= 720px) {
  .caja-panel {
    padding: var(--space-16);
  }
}
</style>
