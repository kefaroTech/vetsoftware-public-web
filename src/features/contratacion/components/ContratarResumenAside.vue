<script setup lang="ts">
import { computed } from 'vue'
import { formatDateLong } from '@/composables/format'
import { formatMoney } from '@/composables/money'
import type { CatalogoComercial } from '@/features/asistente/types/catalogo.types'
import {
  CAPACITY_UNIT_LABEL,
  CAPACITY_UNIT_LABEL_ONE,
  CICLO_LABEL,
} from '@/features/landing/types/plans.types'
import type { ResumenContratacion } from '../types/contratacion.types'

/**
 * Lo que se confirma, al lado del contenido y siempre visible.
 *
 * ── Por qué está al lado y no debajo ───────────────────────────────────────
 * En el paso vinculante la pregunta que se hace quien va a pulsar es «¿qué
 * exactamente estoy comprando y qué me cobran hoy?», y la respuesta tenía que
 * buscarse rodando. Fijo al lado, la respuesta no se pierde de vista mientras se
 * lee la letra pequeña ni mientras se marca la casilla.
 *
 * ── Ninguna cifra se suma aquí ─────────────────────────────────────────────
 * Las líneas y los importes son los que trae el resumen, que en la rama modular
 * los pone `POST /quotes/preview` y en la de la propuesta el propio servidor.
 * El único número escrito a mano es el cero de «Hoy pagas», y ese sí es un cero
 * real: durante la prueba no se cobra nada.
 */
const props = defineProps<{
  resumen: ResumenContratacion
  /**
   * Sólo llega cuando la pantalla lo tenía cargado —la rama modular—. Con
   * `null` no se afirma cuántos módulos quedan fuera: contarlos exige saber
   * cuántos publica el catálogo, y esa cuenta no se inventa.
   */
  catalogo: CatalogoComercial | null
  /** ISO del primer día que se cobra, o `null` si no hay con qué calcularlo. */
  primerCobro: string | null
}>()

const conteo = computed(() => {
  const n = props.resumen.lineasPrueba.length
  return n === 1 ? '1 módulo' : `${n} módulos`
})

function unidades(cantidad: number, eje: 'BRANCH' | 'USER'): string {
  const rotulo = cantidad === 1 ? CAPACITY_UNIT_LABEL_ONE[eje] : CAPACITY_UNIT_LABEL[eje]
  return `${cantidad} ${rotulo}`
}

/**
 * «Mes a mes · 1 sede · 3 personas».
 *
 * <p>La propuesta a medida se queda sólo con el ciclo: sus cantidades ya viajan
 * como línea del servidor, con su importe, y repetirlas arriba sería la segunda
 * cifra del mismo hecho que `ResumenPlan.sedes` existe para evitar.
 */
const lineaSeleccion = computed(() => {
  const r = props.resumen
  if (r.origen !== 'PLAN') return CICLO_LABEL[r.ciclo]
  return [CICLO_LABEL[r.ciclo], unidades(r.sedes, 'BRANCH'), unidades(r.usuarios, 'USER')].join(
    ' · ',
  )
})

const apagados = computed(() => {
  const cat = props.catalogo
  if (!cat) return null
  const dentro = new Set(props.resumen.lineasPrueba.map((l) => l.code))
  const fuera = cat.articulos.filter((a) => !a.obligatorio && a.vendible && !dentro.has(a.code))
  if (fuera.length === 0) return null
  return fuera.length === 1
    ? 'El otro módulo del producto queda apagado y no se cobra.'
    : `Los otros ${fuera.length} módulos quedan apagados y no se cobran.`
})

/** El rótulo lo pone el servidor en la propia línea: es el que va a ir en la oferta. */
const desglose = computed(() =>
  props.resumen.lineas.map((l) => ({
    code: l.code,
    rotulo: l.cantidad > 1 ? `${l.cantidad} × ${l.nombre}` : l.nombre,
    importe: l.importe === null ? '—' : formatMoney(l.importe),
  })),
)
</script>

<template>
  <aside class="cra ds-card" aria-labelledby="confirmas-h2">
    <h2 id="confirmas-h2" class="cra-rotulo">Lo que confirmas</h2>
    <p class="cra-conteo">{{ conteo }}</p>
    <p class="cra-seleccion">{{ lineaSeleccion }}</p>
    <p v-if="apagados" class="cra-fuera">{{ apagados }}</p>

    <div v-if="desglose.length > 0" class="cra-desglose">
      <p v-for="l in desglose" :key="l.code" class="cra-linea">
        <span>{{ l.rotulo }}</span>
        <span class="ds-num">{{ l.importe }}</span>
      </p>
    </div>

    <!-- La respuesta a la única pregunta que se hace quien está a punto de
         confirmar, y el cero es de verdad: la prueba corre desde hoy. -->
    <p class="cra-hoy">
      <strong>Hoy pagas {{ formatMoney(0) }}.</strong>
      <template v-if="primerCobro">
        El primer cobro sería el {{ formatDateLong(primerCobro) }}, y te avisamos por correo antes.
      </template>
    </p>
  </aside>
</template>

<style scoped>
.cra {
  position: sticky;
  top: var(--space-16);
  min-inline-size: 0;
}

.cra-rotulo {
  margin: 0;
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--warm-600);
}

.cra-conteo {
  margin: var(--space-12) 0 0;
  font-size: var(--text-base);
  font-weight: var(--weight-semibold);
  color: var(--warm-900);
}

.cra-seleccion {
  margin: var(--space-3) 0 0;
  font-size: var(--text-body);
  color: var(--warm-600);
}

.cra-fuera {
  margin: var(--space-12) 0 0;
  font-size: var(--text-xs);
  line-height: 1.55;
  color: var(--warm-600);
}

.cra-desglose {
  margin-block-start: var(--space-16);
  border-block-start: 1px solid var(--border);
  padding-block-start: var(--space-12);
}

.cra-linea {
  display: flex;
  justify-content: space-between;
  gap: var(--space-12);
  margin: 0;
  font-size: var(--text-body);
  color: var(--warm-600);
}

.cra-hoy {
  margin: var(--space-16) 0 0;
  font-size: var(--text-body);
  line-height: 1.55;
  color: var(--warm-900);
}
</style>
