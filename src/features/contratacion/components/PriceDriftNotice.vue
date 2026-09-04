<script setup lang="ts">
import { ref, useId } from 'vue'
import { formatMoney } from '@/composables/money'

/**
 * §5, caso 3 — «el precio cambió mientras decidía». El caso que justifica media
 * decisión del catálogo.
 *
 * El importe que el usuario VIO al elegir viaja en la intención; en el paso
 * vinculante se compara con el que se recalcula. Si difieren, esto aparece
 * **antes** del resumen y **se lleva el foco** — eso es lo que lo separa de un
 * adorno, y es la única mitad de §3.3.4 que el padre puede sostener hoy.
 *
 * <p>Lo que este aviso **no** hace, aunque este docblock lo afirmó durante un
 * tiempo: no desmarca ninguna casilla ya marcada. Cuando aparece, la casilla
 * todavía no existe o acaba de nacer sin marcar, así que no hay consentimiento
 * previo que retirar; la línea del padre que decía hacerlo era inalcanzable y
 * se quitó. Ver la cabecera de `ContratarView.vue`.
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
      <!-- Sin coletilla de impuesto: las dos cifras son la base gravable
           (`subtotalMensualEquivalente` contra `importeVistoMensual`), así que rotularlas «IVA
           incluido» sería una afirmación tributaria falsa. El desglose de abajo tiene las tres. -->
      <p class="drift-text">
        Cuando lo elegiste: <strong>{{ formatMoney(antes) }} {{ sufijo }}</strong
        >.
      </p>
      <p class="drift-text">
        Ahora: <strong>{{ formatMoney(ahora) }} {{ sufijo }}</strong
        >.
      </p>
      <p class="drift-text">
        Es el precio de lista vigente hoy, sin el IVA que sí lleva el total. Revisa el resumen antes
        de confirmar.
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
