<script setup lang="ts">
import { computed, useId } from 'vue'
import { formatMoney } from '@/composables/money'
import type { CatalogoComercial, PaqueteCatalogo } from '@/features/asistente/types/catalogo.types'
import { modulosDelPaquete } from '../composables/cotizadorLineas'
import { precioBase, sufijoCiclo } from '../composables/planPricing'
import type { Ciclo, PublicPlan } from '../types/plans.types'

/**
 * Las combinaciones conocidas, como atajo de selección.
 *
 * ── Radio nativo, no un `<button>` con un punto dibujado ────────────────────
 * Es una elección entre opciones excluyentes de un formulario, no una acción
 * con efecto inmediato: `radiogroup` da flechas, agrupación y anuncio del
 * estado sin escribir teclado, y el modo de formularios del lector lo enumera.
 * Un `<button aria-pressed>` no aparece ahí.
 *
 * <p>Marcar una NO destruye lo que el usuario escribió arriba: siembra
 * casillas, y el relato es lo más caro que hay en esta pantalla.
 *
 * <p>Cuál queda marcada no es un estado propio: es el paquete que la selección
 * reproduce EXACTAMENTE ahora mismo. En cuanto se toca una casilla suelta,
 * ninguna lo está, y eso es la verdad del precio —el descuento del paquete se
 * pierde en ese momento—, no una omisión.
 */
const props = defineProps<{
  plans: PublicPlan[]
  catalogo: CatalogoComercial | null
  ciclo: Ciclo
  /** El paquete que la selección reproduce, si lo hay. */
  paqueteActual: PaqueteCatalogo | null
}>()

const emit = defineEmits<{ sembrar: [modulos: string[]] }>()

const nombreGrupo = useId()

const paquetesPorCode = computed(
  () => new Map((props.catalogo?.paquetes ?? []).map((p) => [p.code, p])),
)

function elegir(plan: PublicPlan) {
  const cat = props.catalogo
  const paquete = paquetesPorCode.value.get(plan.code)
  if (!cat || !paquete) return
  emit('sembrar', modulosDelPaquete(paquete, cat))
}
</script>

<template>
  <div class="pcb-lista">
    <label
      v-for="p in plans"
      :key="p.code"
      class="pcb-opt"
      :class="{ 'is-on': paqueteActual?.code === p.code }"
    >
      <input
        type="radio"
        :name="nombreGrupo"
        :value="p.code"
        :checked="paqueteActual?.code === p.code"
        @change="elegir(p)"
      />
      <span class="pcb-cuerpo">
        <span class="pcb-nombre">{{ p.name }}</span>
        <span class="pcb-tagline">{{ p.tagline }}</span>
      </span>
      <span class="pcb-precio">
        {{ formatMoney(precioBase(p, ciclo)) }} {{ sufijoCiclo(ciclo) }}
      </span>
    </label>
  </div>
</template>

<style scoped>
.pcb-lista {
  display: flex;
  flex-direction: column;
  gap: 9px;
  margin-block-start: 14px;
}

.pcb-opt {
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 15px 17px;
  border-radius: 13px;
  border: 1px solid var(--pub-line);
  background: var(--pub-surface);
  cursor: pointer;
}

.pcb-opt.is-on {
  border-color: var(--pub-ame-600);
}

.pcb-opt input {
  accent-color: var(--pub-ame-600);
  inline-size: 18px;
  block-size: 18px;
  flex: none;
}

.pcb-cuerpo {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-inline-size: 0;
}

.pcb-nombre {
  font-size: 14.5px;
  font-weight: 600;
  color: var(--pub-ink-900);
}

.pcb-tagline {
  font-size: 12.5px;
  line-height: 1.45;
  color: var(--pub-ink-600);
}

.pcb-precio {
  margin-inline-start: auto;
  flex: none;
  font-size: 13px;
  font-weight: 600;
  color: var(--pub-ame-700);
  font-variant-numeric: tabular-nums;
}
</style>
