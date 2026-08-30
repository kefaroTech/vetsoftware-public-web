<script setup lang="ts">
import { importeEstimado, sufijoCiclo } from '../../landing/composables/planPricing'
import type { Ciclo } from '../../landing/types/plans.types'
import type { LineaRecomendada } from '../types/asistente.types'
import MotivoIa from './MotivoIa.vue'

/**
 * Lo que el asistente sugirió **sin que se lo pidieran**.
 *
 * ── Por qué va aquí abajo y no dentro de la propuesta ───────────────────────
 * El modelo devuelve dos listas y el prompt lo sesga explícitamente hacia la
 * segunda: «ante la duda, va en recomendados». Fundirlas inflaría el carrito
 * justo con lo que el propio modelo marcó como no pedido, y con el total ya
 * sumado — o sea, cobrando por una duda.
 *
 * <p>Así que **no suman al total, no están marcadas, y no cierran sus
 * `REQUIRES`** hasta que alguien las acepta. Cada una lleva su motivo, con la
 * misma tipografía de nota que las del carrito: un upsell sin explicación es
 * precisamente lo que la decisión de producto prohíbe.
 */
defineProps<{ recomendados: LineaRecomendada[]; ciclo: Ciclo }>()

defineEmits<{ anadir: [code: string] }>()
</script>

<template>
  <section v-if="recomendados.length > 0" aria-labelledby="prop-h3-reco" class="prec">
    <h3 id="prop-h3-reco" class="prec-h3">Esto no lo pediste, pero quizá te sirva</h3>
    <p class="prec-nota">No está incluido en el total. Añádelo solo si lo necesitas.</p>

    <ul class="ds-list-reset">
      <li v-for="r in recomendados" :key="r.code" class="prec-fila">
        <div class="prec-texto">
          <span class="prec-nombre">{{ r.nombre }}</span>
          <span class="prec-precio">
            {{ importeEstimado(r.importe) }} {{ sufijoCiclo(ciclo) }}
          </span>
          <MotivoIa v-if="r.motivo" :texto="r.motivo" />
        </div>
        <button
          type="button"
          class="ds-btn ds-btn--ghost prec-anadir"
          :aria-label="`Añadir ${r.nombre} a tu propuesta`"
          @click="$emit('anadir', r.code)"
        >
          Añadir
        </button>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.prec {
  margin-block-start: 18px;
  padding: 14px;
  border: 1px dashed var(--pub-line-strong);
  border-radius: 12px;
}

.prec-h3 {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: var(--pub-ink-900);
}

.prec-nota {
  margin: 3px 0 10px;
  font-size: 12.5px;
  color: var(--pub-ink-600);
}

.prec-fila {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding-block: 8px;
}

.prec-texto {
  flex: 1 1 auto;
  min-width: 0;
}

.prec-nombre {
  font-size: 14px;
  font-weight: 700;
  color: var(--pub-ink-900);
}

.prec-precio {
  margin-inline-start: 8px;
  font-size: 12.5px;
  color: var(--pub-ink-600);
}

.prec-anadir {
  flex: none;
  min-block-size: 44px;
}
</style>
