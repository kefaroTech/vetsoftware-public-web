<script setup lang="ts">
import { computed } from 'vue'
import { AlertTriangle, Clock } from 'lucide-vue-next'
import type { DianStatus } from '../types/facturacion'

/**
 * Resultado de la emisión, en el comprobante de la venta.
 *
 * Es el estado presente del documento —«sigue siendo verdad treinta segundos
 * después de leerlo»—, así que va en banner y no en toast
 * (`docs/ux/patron-de-mensajes.md` §2). Tres tonos y no uno:
 *
 * - `VALIDADO` no pinta nada: el éxito ya lo dice el propio recibo y el
 *   `FeStatusPill` de al lado (§3, «cuándo NO poner nada»).
 * - `PENDIENTE` es un **aviso**: la venta quedó registrada pero hay una
 *   consecuencia que el cajero no vería por su cuenta. `role="status"`.
 * - Cualquier otro estado —`RECHAZADO`, `CONTINGENCIA` y lo que la DIAN
 *   añada— es un **error**: el documento no es válido y alguien tiene que
 *   hacer algo. `role="alert"`, y el estado crudo a la vista para que soporte
 *   pueda buscarlo.
 *
 * Los textos son literales de §6 del patrón: no se reescriben aquí.
 */
const props = defineProps<{ status: DianStatus | null | undefined }>()

const kind = computed<'pending' | 'rejected' | null>(() => {
  if (!props.status || props.status === 'VALIDADO') return null
  return props.status === 'PENDIENTE' ? 'pending' : 'rejected'
})
</script>

<template>
  <div
    v-if="kind === 'pending'"
    class="dian-notice ds-banner ds-banner--warning ds-banner--flush"
    role="status"
  >
    <Clock :size="16" :stroke-width="1.9" class="ds-banner-icon" aria-hidden="true" />
    <p class="dian-text">
      <strong>Emisión a la DIAN pendiente.</strong> El documento está guardado. Si en 24 h sigue
      pendiente, avisa a administración.
    </p>
  </div>
  <div
    v-else-if="kind === 'rejected'"
    class="dian-notice ds-banner ds-banner--error ds-banner--flush"
    role="alert"
  >
    <AlertTriangle :size="16" :stroke-width="1.9" class="ds-banner-icon" aria-hidden="true" />
    <p class="dian-text">
      <strong>La DIAN rechazó la factura.</strong> La venta está registrada pero el documento no es
      válido. Anótalo y avisa a administración.
      <span class="dian-raw">Estado del documento: {{ status }}</span>
    </p>
  </div>
</template>

<style scoped>
/* Sobre `.ds-banner--warning` / `--error`: solo lo que la primitiva no fija. El
   color NO se escribe aquí —pesaría (0,2,0) con el `[data-v-…]` del scope y le
   ganaría al design system, que es la trampa de especificidad de `AGENTS.md`. */
.dian-notice {
  align-items: flex-start;
}

.dian-text {
  margin: 0;
}

/* El estado crudo, para que soporte pueda identificar el documento. Hereda el
   color del banner en vez de estrenar uno: sobre `--danger-bg` un warm-500 no
   está medido. */
.dian-raw {
  display: block;
  margin-top: 4px;
  font-size: 11px;
  opacity: 0.85;
}
</style>
