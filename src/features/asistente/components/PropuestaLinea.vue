<script setup lang="ts">
import { computed } from 'vue'
import { importeEstimado, sufijoCiclo } from '../../landing/composables/planPricing'
import type { Ciclo } from '../../landing/types/plans.types'
import type { PropuestaLinea } from '../types/asistente.types'
import MotivoIa from './MotivoIa.vue'

/**
 * Una línea de la propuesta.
 *
 * ── De dónde vino cada línea se dice de CUATRO formas, y ninguna es el color ─
 * §1.4.1 *Use of Color* (A) prohíbe que el color sea el único portador de una
 * información. Aquí lo sería con facilidad —un borde morado para «lo puso la
 * IA»— así que hay tres señales más:
 *
 *  1. **La agrupación**: dos `<h3>` distintos en la tabla. Es la única señal que
 *     funciona en el resumen de encabezados de un lector de pantalla.
 *  2. **El chip, con texto real** y no un punto de color.
 *  3. **La presencia del motivo**: solo las líneas de IA llevan explicación. Una
 *     línea sin motivo es, por construcción, una que puso el usuario.
 *  4. El color, al final, como refuerzo. Es el único que se puede perder sin que
 *     se pierda información.
 *
 * ── El botón «Quitar» ───────────────────────────────────────────────────────
 * Con **texto**, no solo icono, y con **nombre accesible único**: ocho botones
 * que dicen «Quitar» en la lista de controles de un lector son ocho botones
 * inservibles (§2.4.4). Y con 44 px de área táctil — 24 es el mínimo legal de
 * §2.5.8, 44 es lo que hace usable una lista con una sola mano, que es como se
 * usa esto.
 */
const props = defineProps<{
  linea: PropuestaLinea
  ciclo: Ciclo
  /** Entró en el último recálculo: se marca durante esta actualización. */
  nuevo?: boolean
}>()

defineEmits<{ quitar: [code: string] }>()

const CHIP: Readonly<Record<PropuestaLinea['origen'], string>> = {
  IA: 'Sugerido',
  MANUAL: 'Lo añadiste tú',
  REQUISITO: 'Necesario',
  BASE: 'Base',
}

/**
 * El chip del requisito nombra QUIÉN lo exige.
 *
 * <p>«Necesario para Cuentas abiertas» no es lo mismo que «te lo sugerimos» ni
 * que «lo añadiste tú»: es una tercera cosa, el usuario no la eligió y el modelo
 * no la propuso, y sin el nombre del culpable la línea aparece sin explicación
 * en el total.
 */
const chip = computed(() =>
  props.linea.origen === 'REQUISITO' && props.linea.requeridoPor
    ? `Necesario para ${props.linea.requeridoPor}`
    : CHIP[props.linea.origen],
)

/** «14 días gratis» / «sin prueba». `null` no es cero y se dice con palabras. */
const prueba = computed(() =>
  props.linea.trialDays ? `${props.linea.trialDays} días gratis` : 'sin prueba',
)

/**
 * «× 3», y solo cuando hay más de una.
 *
 * <p>No es adorno: {@link PropuestaLinea.importe} es el precio **unitario** que
 * devolvió el servidor. Una línea de tres unidades sin decir que son tres enseña
 * un tercio de lo que aporta al subtotal, y el lector no tiene forma de saberlo.
 * Se dice el dato en vez de multiplicar aquí, que sería calcular dinero en el
 * cliente.
 */
const cantidad = computed(() => (props.linea.cantidad > 1 ? `× ${props.linea.cantidad}` : null))

/** El núcleo no se puede quitar: es el mínimo estructural de toda cuenta. */
const sePuedeQuitar = computed(() => props.linea.code !== 'CORE')
</script>

<template>
  <li class="pli" :class="{ 'pli--ia': linea.origen === 'IA' }">
    <div class="pli-cab">
      <span class="pub-badge pli-chip">{{ chip }}</span>
      <span v-if="nuevo" class="pub-badge pli-chip">Nuevo</span>
      <span class="pli-nombre">{{ linea.nombre }}</span>
      <span class="pli-precio">
        <span v-if="cantidad" class="pli-cantidad">{{ cantidad }}</span>
        {{ importeEstimado(linea.importe) }} {{ sufijoCiclo(ciclo) }}
        <span class="pli-prueba">· {{ prueba }}</span>
      </span>
    </div>

    <!-- El motivo lo escribió un modelo y va en CURSIVA. La nota de una
         dependencia es dato del catálogo y va en REDONDA: la distinción entre
         «lo escribió un modelo» y «lo dice el catálogo» tiene que verse. -->
    <MotivoIa v-if="linea.origen === 'IA' && linea.motivo" :texto="linea.motivo" />
    <p v-else-if="linea.notaRequisito" class="pli-nota">{{ linea.notaRequisito }}</p>

    <button
      v-if="sePuedeQuitar"
      type="button"
      class="ds-btn ds-btn--plain pli-quitar"
      :aria-label="`Quitar ${linea.nombre}`"
      @click="$emit('quitar', linea.code)"
    >
      Quitar
    </button>
  </li>
</template>

<style scoped>
.pli {
  position: relative;
  padding: 12px 96px 12px 14px;
  border-block-end: 1px solid var(--pub-line-strong);
}

.pli--ia {
  border-inline-start: 3px solid var(--pub-ame-600);
}

.pli-cab {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;
}

.pli-chip {
  flex: none;
}

.pli-nombre {
  flex: 1 1 auto;
  min-width: 0;
  font-size: 14.5px;
  font-weight: 700;
  color: var(--pub-ink-900);
}

.pli-precio {
  flex: none;
  font-size: 13px;
  font-weight: 600;
  color: var(--pub-ink-900);
}

.pli-cantidad {
  font-weight: 700;
}

.pli-prueba {
  font-weight: 400;
  color: var(--pub-ink-600);
}

.pli-nota {
  margin: 3px 0 0;
  font-size: 12.5px;
  line-height: 1.45;
  color: var(--pub-ink-600);
}

/* 44×44 de área táctil sin agrandar el icono ni el texto: el objetivo crece
   con padding, no con tipografía. §2.5.8 pide 24; 44 es lo usable con pulgar. */
.pli-quitar {
  position: absolute;
  inset-block-start: 8px;
  inset-inline-end: 6px;
  min-width: 44px;
  min-height: 44px;
}
</style>
