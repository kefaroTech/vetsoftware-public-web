<script setup lang="ts">
import type { Component } from 'vue'

/**
 * El aviso en caja de la agenda: choque de horario, error de guardado, sujeto sin
 * indicar, motivo de cancelación.
 *
 * Existe como componente y no como cuatro copias de las mismas seis
 * declaraciones porque justo eso es lo que mide el presupuesto de CSS: la caja se
 * repetía byte a byte en el modal de detalle y en el de formulario, y al partir
 * este último en secciones se habría copiado dos veces más. No sube a
 * `primitives.css` (`.ds-banner`) porque sus valores no coinciden con los de esa
 * primitiva —radio 9 en vez de 8, 12,5px en vez de 13, sin `margin-bottom` ni
 * `align-items`— y unificarlos cambiaría el aspecto de las dos pantallas.
 */
withDefaults(
  defineProps<{
    tone: 'warn' | 'err' | 'neutral'
    /** Icono Lucide del aviso. */
    icon: Component
    iconSize?: number
  }>(),
  { iconSize: 16 },
)
</script>

<template>
  <div class="banner" :class="tone">
    <component :is="icon" :size="iconSize" :stroke-width="1.7" class="ds-banner-icon" />
    <slot />
  </div>
</template>

<style scoped>
.banner {
  display: flex;
  gap: 9px;
  padding: 10px 12px;
  border-radius: 9px;
  font-size: 12.5px;
  line-height: 1.5;
}

.banner.warn {
  background: oklch(95% 0.07 80deg);
  color: oklch(42% 0.13 60deg);
  border: 1px solid var(--warning-200);
}

.banner.err {
  background: var(--danger-50);
  color: var(--danger-700);
  border: 1px solid oklch(88% 0.07 25deg);
}

.banner.neutral {
  background: var(--warm-100);
  color: var(--warm-700);
  border: 1px solid var(--warm-200);
}

/* El contenido llega por slot, así que lleva el `data-v` del padre y no el de
   este componente: sin `:slotted` la regla no lo alcanzaría. */
:slotted(b) {
  font-weight: 600;
}
</style>
