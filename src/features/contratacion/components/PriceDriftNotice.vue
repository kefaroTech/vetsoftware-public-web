<script setup lang="ts">
import { ref, useId } from 'vue'
import { formatMoney } from '@/composables/money'

/**
 * §5, caso 3 — «el precio cambió mientras decidía». El caso que justifica media
 * decisión del catálogo.
 *
 * El importe que el usuario VIO al elegir viaja en la intención; en el paso
 * vinculante se compara con el que da el servidor. Si difieren, esto aparece
 * **antes** del resumen y el padre hace las dos cosas que lo convierten en un
 * cumplimiento de §3.3.4 y no en un adorno: **desmarca la casilla de términos**
 * y devuelve el botón a su estado inicial. Nadie confirma un importe que no ha
 * leído.
 *
 * Lleva `role="alert"` y `tabindex="-1"` porque **sí** acaba de ocurrir algo que
 * cambia la decisión, a diferencia del aviso de modo demostración: el padre le
 * mueve el foco.
 */
defineProps<{
  antes: number
  ahora: number
  sufijo: string
}>()

const uid = useId()
const tituloId = `${uid}-drift`

const root = ref<HTMLElement | null>(null)

/** El padre lo llama tras detectar la deriva: el foco se mueve al encabezado del aviso. */
function focus() {
  root.value?.focus({ preventScroll: false })
}

defineExpose({ focus })
</script>

<template>
  <div
    ref="root"
    class="ds-banner ds-banner--warning drift"
    role="alert"
    tabindex="-1"
    :aria-labelledby="tituloId"
  >
    <div class="drift-body">
      <h2 :id="tituloId" class="drift-title">El precio cambió desde que lo elegiste</h2>
      <p class="drift-text">
        Cuando lo elegiste: <strong>{{ formatMoney(antes) }} + IVA {{ sufijo }}</strong
        >.
      </p>
      <p class="drift-text">
        Ahora: <strong>{{ formatMoney(ahora) }} + IVA {{ sufijo }}</strong
        >.
      </p>
      <p class="drift-text">
        Es el precio de lista vigente hoy. Revisa el resumen antes de confirmar.
      </p>
    </div>
  </div>
</template>

<style scoped>
.drift {
  align-items: flex-start;
}

.drift:focus {
  outline: none;
}

.drift-body {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
}

.drift-title {
  margin: 0;
  font-size: 14.5px;
  font-weight: 700;
}

.drift-text {
  margin: 0;
  font-size: 13px;
  line-height: 1.55;
  font-variant-numeric: tabular-nums;
}
</style>
