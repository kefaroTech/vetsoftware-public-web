<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { formatMoney } from '@/composables/money'
import { sufijoCiclo } from '../../landing/composables/planPricing'
import type { PropuestaTotales } from '../types/asistente.types'

/**
 * Subtotal, IVA y total. **Los tres vienen del servidor.**
 *
 * <p>Este componente no suma nada: recibe `totales` y los pinta. Si alguna vez
 * aparece aquí un `reduce` sobre las líneas, la pantalla habrá empezado a
 * mostrar una cifra que nadie calculó — que es exactamente el defecto que este
 * repositorio ya publicó dos veces, una de ellas como extrapolación anual.
 *
 * ── La región viva, y las dos decisiones que la hacen usable ────────────────
 *
 *  1. **Es estrecha**: envuelve el importe, no el bloque. Si envolviera el
 *     resumen entero, cada cambio dispararía la lectura completa. Es la lección
 *     que `PlanesConfigurador` ya dejó escrita.
 *  2. **Coalesce 250 ms, y no es el retardo de 400 ms de `PlanesConfigurador`.**
 *     Aquél existe porque allí hay tecleo continuo y sin retardo «12» se anuncia
 *     primero como «1». Aquí el recálculo lo dispara un evento **discreto** —un
 *     clic, una casilla— y no hay estados intermedios que suprimir: un retardo
 *     fijo solo conseguiría que el anuncio llegue tarde. Lo que sí hay que
 *     evitar es la **ráfaga**: marcar cuatro casillas seguidas produce cuatro
 *     recálculos. Por eso el primero se anuncia **de inmediato** y los que
 *     lleguen dentro de la ventana se funden en uno al cerrarla.
 *
 * <p>Son mecanismos distintos por motivos distintos, y por eso están
 * documentados aquí: para que nadie los unifique en una refactorización.
 *
 * <p>`role="status"` y no `alert`: no ha fallado nada.
 */
const props = defineProps<{ totales: PropuestaTotales }>()

const COALESCENCIA_MS = 250

const anuncio = ref('')
let temporizador: ReturnType<typeof setTimeout> | null = null
let ventanaAbierta = false

function texto(): string {
  return `Total: ${formatMoney(props.totales.total)} ${sufijoCiclo(props.totales.ciclo)}, IVA incluido.`
}

function anunciar(): void {
  if (!ventanaAbierta) {
    // Nada en la ventana anterior: se dice ya. Un evento discreto no gana nada
    // esperando.
    anuncio.value = texto()
    ventanaAbierta = true
    temporizador = setTimeout(() => {
      ventanaAbierta = false
      temporizador = null
    }, COALESCENCIA_MS)
    return
  }
  // Estamos dentro de la ventana: se funde con lo que venga y se dice una sola
  // vez al cerrarla.
  if (temporizador) clearTimeout(temporizador)
  temporizador = setTimeout(() => {
    anuncio.value = texto()
    ventanaAbierta = false
    temporizador = null
  }, COALESCENCIA_MS)
}

watch(() => props.totales.total, anunciar)

onBeforeUnmount(() => {
  if (temporizador) clearTimeout(temporizador)
})
</script>

<template>
  <div class="ptot">
    <dl class="ptot-lista">
      <div class="ptot-fila">
        <dt>Subtotal</dt>
        <dd>{{ formatMoney(totales.subtotal) }}</dd>
      </div>
      <div class="ptot-fila">
        <!-- El porcentaje solo si el servidor lo dijo. `AssistantProposalResponse`
             no publica tipo impositivo y el `taxRate` por línea no declara su
             escala, así que un «IVA 0,19 %» —o un 19 donde iba 0,19— sería una
             cifra inventada al lado de un importe que sí es real. El importe se
             sigue enseñando: ese no falta. -->
        <dt v-if="totales.tasaImpuesto !== null">IVA {{ totales.tasaImpuesto }} %</dt>
        <dt v-else>IVA</dt>
        <dd>{{ formatMoney(totales.impuesto) }}</dd>
      </div>
      <div class="ptot-fila ptot-fila--total">
        <dt>Total {{ sufijoCiclo(totales.ciclo) }}</dt>
        <dd>{{ formatMoney(totales.total) }}</dd>
      </div>
    </dl>

    <!-- Solo se dice si hay algo de prueba. `primerMes` puede valer 0 —todo el
         carrito de prueba— y eso es una afirmación fuerte que merece decirse;
         `null` es «no aplica» y no se pinta. -->
    <p v-if="totales.primerMes !== null" class="ptot-prueba">
      Los primeros días pagarías {{ formatMoney(totales.primerMes) }}: el resto va de prueba.
    </p>

    <p class="ds-sr-only" role="status" aria-live="polite">{{ anuncio }}</p>
  </div>
</template>

<style scoped>
.ptot-lista {
  margin: 0;
  padding: 12px 14px;
  border-radius: 12px;
  background: var(--pub-line-2);
}

.ptot-fila {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
  color: var(--pub-ink-700);
}

.ptot-fila + .ptot-fila {
  margin-block-start: 6px;
}

.ptot-fila--total {
  padding-block-start: 8px;
  border-block-start: 1px solid var(--pub-line-strong);
  font-size: 15px;
  font-weight: 700;
  color: var(--pub-ink-900);
}

.ptot-fila dd {
  margin: 0;
}

.ptot-prueba {
  margin: 8px 0 0;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--pub-ok-tx);
}
</style>
