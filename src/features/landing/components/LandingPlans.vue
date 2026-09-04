<script setup lang="ts">
import { RefreshCw, TriangleAlert } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import { formatMoney } from '@/composables/money'
import { useCatalogoComercial } from '@/features/asistente/composables/useCatalogoComercial'
import type { ArticuloCatalogo } from '@/features/asistente/types/catalogo.types'
import CicloFieldset from './CicloFieldset.vue'
import PlanCard from './PlanCard.vue'
import { modulosDelPaquete } from '../composables/cotizadorLineas'
import { sufijoCiclo } from '../composables/planPricing'
import {
  CAPACITY_UNIT_LABEL,
  CAPACITY_UNIT_LABEL_ONE,
  type Ciclo,
  type PlanCapacity,
  type PublicPlan,
} from '../types/plans.types'

/**
 * §D — las combinaciones frecuentes de la landing.
 *
 * Los tres estados están escritos, no solo el feliz:
 *
 *  - Si `fetchPlans()` falla, la sección **no desaparece**: se pinta el error con
 *    reintento y el CTA de registro sigue vivo más abajo. Una landing sin
 *    precios convierte peor; una landing rota no convierte nada.
 *  - El error de red se pinta ANTES que el vacío: «no hay combinaciones» y «no
 *    pudimos cargarlas» son cosas distintas y se dicen distinto.
 *
 * ── Un atajo de selección, no un paquete cerrado ────────────────────────────
 * La unidad de compra es el módulo. Estas tarjetas solo marcan varios de golpe,
 * y por eso el CTA siembra la selección en vez de «elegir un plan». Lo que se
 * cobra al pulsarlas es el precio de paquete —con su descuento— porque la
 * selección coincide exactamente con él; en cuanto se quita una casilla, se
 * cobran las piezas sueltas y el precio sube. Esa subida se avisa ANTES, en la
 * propia tarjeta.
 *
 * <p>Cuál es la destacada lo dice `packs[].recommended` del servidor, y por eso
 * la tarjeta no lee `PublicPlan.recommended`: ese lo pone un overlay editorial
 * del front (`plans.content.ts`) y afirmaría lo que el negocio ya no decide aquí.
 */
const props = defineProps<{
  plans: PublicPlan[]
  loading: boolean
  error: unknown
  /**
   * El catálogo ya VOLVIÓ del servidor, con lo que traiga.
   *
   * <p>Sin esto, «Todavía no hay combinaciones publicadas» se pintaba en el
   * primer render: `usePlanes()` pide el catálogo en su `onMounted`, que corre
   * DESPUÉS, así que hasta entonces `loading` es `false` y la lista está vacía.
   * Es el mismo criterio que `useCatalogoComercial.vacio` y
   * `PlanesView.sinPaquetes`: el vacío no se afirma hasta que la respuesta vuelve.
   */
  loaded: boolean
}>()

const emit = defineEmits<{
  (e: 'elegir', plan: PublicPlan, ciclo: Ciclo): void
  (e: 'sembrar', modulos: string[], ciclo: Ciclo): void
  (e: 'reintentar'): void
}>()

const ciclo = ref<Ciclo>('MENSUAL')

const { catalogo, refresh: refrescarCatalogo } = useCatalogoComercial(ciclo)

interface Combinacion {
  plan: PublicPlan
  recomendada: boolean
  modulos: ArticuloCatalogo[]
  /** El núcleo y estos módulos por separado. `null` si falta algún precio. */
  sumaSuelta: number | null
}

const nucleo = computed<ArticuloCatalogo | null>(
  () => catalogo.value?.articulos.find((a) => a.obligatorio) ?? null,
)

function sumaSuelta(modulos: ArticuloCatalogo[]): number | null {
  const base = nucleo.value
  if (!base || base.importe === null || modulos.some((m) => m.importe === null)) return null
  return modulos.reduce((total, m) => total + (m.importe ?? 0), base.importe)
}

/**
 * Cada paquete publicado, con sus módulos resueltos a artículos del catálogo.
 *
 * <p>Los dos orígenes son el mismo negocio visto por dos endpoints: `GET /plans`
 * publica el precio de entrada y `GET /catalog` las piezas y la marca de
 * destacada. Sin el segundo la tarjeta sigue en pie —nombre, precio y camino—,
 * solo que sin desglose: cortar la sección por eso sería cortar el ancla de
 * precio de la portada.
 */
const combinaciones = computed<Combinacion[]>(() =>
  props.plans.map((plan) => {
    const cat = catalogo.value
    const paquete = cat?.paquetes.find((p) => p.code === plan.code) ?? null
    const codigos = paquete && cat ? modulosDelPaquete(paquete, cat) : []
    const modulos = codigos.flatMap((code) => cat?.articulos.filter((a) => a.code === code) ?? [])
    return {
      plan,
      recomendada: paquete?.recommended ?? false,
      modulos,
      sumaSuelta: sumaSuelta(modulos),
    }
  }),
)

function unidadesIncluidas(capacidad: PlanCapacity): string {
  const uno = capacidad.included === 1
  const etiqueta = uno
    ? CAPACITY_UNIT_LABEL_ONE[capacidad.unit]
    : CAPACITY_UNIT_LABEL[capacidad.unit]
  return `${capacidad.included} ${etiqueta}`
}

function precioExtra(capacidad: PlanCapacity): number | null {
  return ciclo.value === 'ANUAL'
    ? capacidad.annualExtraUnitAmount
    : capacidad.monthlyExtraUnitAmount
}

/**
 * Lo que toda combinación comparte, con las cifras del catálogo interpoladas.
 *
 * <p>Se calla entera si falta una sola: media frase con un hueco afirma un
 * precio que nadie publicó, y este es el párrafo donde se decide una compra.
 */
const notaBase = computed<string | null>(() => {
  const base = nucleo.value
  const plan = props.plans[0]
  if (!base || base.importe === null || !plan) return null

  const personas = plan.capacities.find((c) => c.unit === 'USER')
  const sedes = plan.capacities.find((c) => c.unit === 'BRANCH')
  if (!personas || !sedes) return null

  const porPersona = precioExtra(personas)
  const porSede = precioExtra(sedes)
  if (porPersona === null || porSede === null) return null

  const cuando = sufijoCiclo(ciclo.value)
  return (
    `Todas parten del núcleo (${formatMoney(base.importe)} ${cuando}) con ` +
    `${unidadesIncluidas(personas)} y ${unidadesIncluidas(sedes)}. Cada sede adicional cuesta ` +
    `${formatMoney(porSede)} ${cuando} y cada persona adicional ${formatMoney(porPersona)} ${cuando}.`
  )
})

/**
 * Marcar los módulos de la combinación. **No toca el texto que escribió el
 * usuario**: sembrar cambia casillas, nunca su relato.
 */
function marcar(combinacion: Combinacion) {
  emit(
    'sembrar',
    combinacion.modulos.map((m) => m.code),
    ciclo.value,
  )
  emit('elegir', combinacion.plan, ciclo.value)
}

function reintentar() {
  emit('reintentar')
  void refrescarCatalogo()
}
</script>

<template>
  <section id="planes" class="pub-section" aria-labelledby="planes-titulo" tabindex="-1">
    <div class="land-plans-head">
      <div class="pub-section-head land-plans-intro">
        <h2 id="planes-titulo">Combinaciones que se piden mucho</h2>
        <p>
          Atajos para marcar varios módulos de una vez, no paquetes cerrados. Al elegir uno puedes
          quitar lo que no uses y el precio baja.
        </p>
      </div>

      <CicloFieldset v-model="ciclo" class="land-plans-ciclo" />
    </div>

    <div v-if="error" class="pub-error land-plans-state" role="alert">
      <p class="land-state-title">
        <TriangleAlert :size="15" :stroke-width="1.8" aria-hidden="true" />
        No pudimos cargar los planes
      </p>
      <p class="land-state-text">
        Puedes crear tu cuenta igualmente y ver el precio exacto antes de confirmar, sin compromiso.
      </p>
      <button type="button" class="land-retry" @click="reintentar">
        <RefreshCw :size="14" :stroke-width="1.8" aria-hidden="true" />
        Volver a intentarlo
      </button>
    </div>

    <p v-else-if="loading" class="land-plans-state land-plans-loading">Cargando los planes…</p>

    <p
      v-else-if="loaded && plans.length === 0"
      class="land-plans-state land-plans-loading"
      role="status"
      data-testid="landing-planes-vacio"
    >
      Todavía no hay paquetes con precio publicado. Escríbenos a
      <a href="mailto:soporte@kefaro.tech">soporte@kefaro.tech</a> y te contamos.
    </p>

    <div v-else class="land-plans-grid">
      <PlanCard
        v-for="c in combinaciones"
        :key="c.plan.code"
        :plan="c.plan"
        :ciclo="ciclo"
        :recomendada="c.recomendada"
        :modulos="c.modulos"
        :suma-suelta="c.sumaSuelta"
        @marcar="marcar(c)"
      />
    </div>

    <p v-if="notaBase" class="land-plans-note" data-testid="landing-planes-nota">
      {{ notaBase }}
    </p>
  </section>
</template>

<style scoped>
.land-plans-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 24px;
  margin-bottom: 26px;
}

.land-plans-intro {
  margin: 0;
  max-width: 44em;
  text-align: left;
}

/* Píldoras: cambia el ASPECTO del conmutador, no el control — sigue siendo el
   `<fieldset>` con radios nativos de `CicloFieldset`, que es lo que da el patrón
   de teclado del APG y el canal no cromático de §1.4.1. */
.land-plans-ciclo :deep(.land-ciclo-opts) {
  gap: 8px;
  margin-top: 8px;
  padding: 4px;
  border-radius: 12px;
  background: var(--pub-tint-100);
}

.land-plans-ciclo :deep(.land-ciclo-opt) {
  min-height: 38px;
  padding: 0 15px;
  border: none;
  border-radius: 9px;
  background: transparent;
  font-weight: 500;
}

.land-plans-ciclo :deep(.land-ciclo-opt.is-on) {
  background: var(--pub-surface);
  color: var(--pub-ink-900);
  box-shadow: 0 1px 3px rgb(91 33 182 / 12%);
}

/* Las siete filas que `.pub-plan-card` consume como `subgrid`: insignia,
   título, subtítulo, precio, aviso de descuento, lista y CTA. La sexta se lleva
   el sobrante para que la lista más larga no desplace el CTA de las otras dos.
   El `row-gap` iguala al `gap` interno de la tarjeta: en un eje subdividido las
   dos separaciones tienen que coincidir para que no dependa del navegador cuál
   se aplica. */
.land-plans-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  grid-template-rows: auto auto auto auto auto 1fr auto;
  gap: 14px 18px;
  align-items: stretch;
}

.land-plans-state {
  max-width: 560px;
  margin: 0 auto;
  text-align: center;
}

.land-state-title {
  margin: 0;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
}

.land-state-text {
  margin: 6px 0 0;
}

.land-retry {
  margin-top: 12px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 40px;
  padding: 0 16px;
  border-radius: 9px;
  border: 1px solid var(--pub-err-bd);
  background: var(--pub-surface);
  color: var(--pub-err-tx-2);
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.land-plans-loading {
  font-size: 14px;
  color: var(--pub-ink-600);
}

.land-plans-note {
  margin: 20px 0 0;
  font-size: 12.5px;
  line-height: 1.6;
  color: var(--pub-ink-500);
}

#planes:focus {
  outline: none;
}

@media (width <= 980px) {
  /* En una sola columna no hay barrido horizontal que anclar, y compartir filas
     entre tarjetas apiladas solo abriría huecos. La tarjeta vuelve a apilar su
     propio contenido. */
  .land-plans-grid {
    grid-template-columns: 1fr;
    grid-template-rows: none;
    row-gap: 18px;
  }

  .land-plans-grid > .pub-plan-card {
    display: flex;
    flex-direction: column;
    grid-row: auto;
  }
}
</style>
