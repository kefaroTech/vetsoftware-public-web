<script setup lang="ts">
import { computed } from 'vue'
import { Bell } from 'lucide-vue-next'
import { useFeUvt } from '../composables/useFeUvt'
import { feMoney } from '../composables/feFormat'

/**
 * Aviso de obligación fiscal: por encima de 5 UVT la DIAN exige Factura
 * electrónica con el cliente identificado.
 *
 * Dos cosas que no son estéticas y conviene no deshacer:
 *
 * - **La región viva está en el contenedor externo, que se monta siempre.** El
 *   aviso aparece por una interacción —el total cruza el umbral al añadir una
 *   línea—, no en el primer render; y una región viva que nace con su texto ya
 *   dentro no la anuncia casi ningún lector
 *   (`docs/ux/patron-de-mensajes.md` §4.2c). Por eso el componente decide él
 *   mismo si supera el umbral en vez de recibir un `v-if` del padre: así la
 *   región vive más que el mensaje. Es `status` (polite) y no `alert`: es un
 *   aviso, no un fallo; interrumpir la locución en curso está reservado a lo
 *   que hace perder trabajo (§4.2b).
 * - **El color lo pone `.ds-banner--warning`, no este `scoped`.** Los tokens
 *   `--warning-*` ya están medidos contra WCAG 2.2 §1.4.11 en A11Y-09;
 *   reescribirlos aquí pesaría (0,2,0) con el `[data-v-…]` y le ganaría a la
 *   primitiva, que es la trampa de especificidad de `AGENTS.md`.
 */
const props = defineProps<{ total: number }>()

const { uvtThresholdQty, threshold, thresholdBreakdown, isOverThreshold } = useFeUvt()

const over = computed(() => isOverThreshold(props.total))
</script>

<template>
  <div class="uvt-live" role="status">
    <div v-if="over" class="uvtbanner ds-banner ds-banner--warning ds-banner--flush">
      <Bell :size="16" :stroke-width="1.9" class="ds-banner-icon" aria-hidden="true" />
      <div>
        <strong>Esta venta supera {{ uvtThresholdQty }} UVT ({{ feMoney(threshold) }}).</strong>
        La DIAN exige <strong>Factura electrónica</strong> con los datos fiscales del cliente.
        <div class="sub">{{ thresholdBreakdown() }} · total {{ feMoney(props.total) }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* El contenedor solo existe para sostener la región viva: sin caja propia, y sin
   participar del `gap` del padre cuando no hay aviso que dar. */
.uvt-live {
  display: contents;
}

/* Sobre `.ds-banner--warning`: solo la geometría propia. Nada de color. */
.uvtbanner {
  align-items: flex-start;
  border-radius: 11px;
}

/* Hereda el color del banner (`--warning-fg`, medido) en vez de estrenar uno. */
.sub {
  font-size: 11px;
  margin-top: 3px;
}
</style>
