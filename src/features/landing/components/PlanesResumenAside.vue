<script setup lang="ts">
import { computed, useId } from 'vue'
import { RouterLink } from 'vue-router'
import { formatDateLong } from '@/composables/format'
import { formatMoney } from '@/composables/money'
import type { CatalogoComercial } from '@/features/asistente/types/catalogo.types'
import type { EstadoImporte } from '../composables/useCotizador'
import { sufijoCiclo } from '../composables/planPricing'
import type { CotizacionPreview } from '../types/cotizacion.types'
import type { Ciclo } from '../types/plans.types'

/**
 * Lo que se está comprando, al lado y siempre visible.
 *
 * ── Subtotal sin IVA, y sin fila de total ──────────────────────────────────
 * Es deliberado y es la diferencia con el `<aside>` del paso vinculante, que sí
 * lleva impuesto y total: aquí todavía no se contrata nada, y el número que
 * hace comparable esta pantalla con la portada y con la competencia es el
 * subtotal. El impuesto aparece donde hay algo que pagar.
 *
 * ── El desglose usa el rótulo CORTO ────────────────────────────────────────
 * El selector y la tabla de pruebas usan el nombre completo; aquí no cabe. La
 * divergencia es de diseño, no un descuido.
 *
 * ── Ninguna cifra se suma aquí ─────────────────────────────────────────────
 * Las líneas y el subtotal vienen de `POST /quotes/preview`, calculados con el
 * mismo código que congela una oferta real. Un total sumado en el navegador
 * desconoce los tramos por volumen y acabaría discrepando del que se cobra.
 */
const props = defineProps<{
  catalogo: CatalogoComercial | null
  modulos: string[]
  ciclo: Ciclo
  estado: EstadoImporte
  /** Ya formateada. Nunca `$ 0`: el guion es el marcador de «sin dato». */
  importe: string
  cotizacion: CotizacionPreview | null
  /** ISO del primer día que se cobra, o `null` si no hay con qué calcularlo. */
  primerCobro: string | null
  mensajeDeFallo: string | null
  regionViva: string
  /** El catálogo llegó: sin él no hay códigos de módulo que llevarse al paso siguiente. */
  puedeContinuar: boolean
}>()

defineEmits<{ continuar: [] }>()

const idMotivoBloqueo = useId()

const firme = computed(() => props.estado === 'LISTO')

const sufijo = computed(() =>
  props.estado === 'CALCULANDO' ? 'calculando…' : `+ IVA ${sufijoCiclo(props.ciclo)}`,
)

const conteo = computed(() => {
  const n = props.modulos.length
  if (n === 0) return 'Solo el núcleo'
  return `Núcleo + ${n} ${n === 1 ? 'módulo' : 'módulos'}`
})

const sinContratar = computed(() => {
  const vendibles = (props.catalogo?.articulos ?? []).filter((a) => !a.obligatorio && a.vendible)
  return Math.max(0, vendibles.length - props.modulos.length)
})

const noPagas = computed(() => {
  const n = sinContratar.value
  if (n === 0) return null
  return n === 1
    ? 'No pagas el otro módulo del producto.'
    : `No pagas los otros ${n} módulos del producto.`
})

/**
 * El núcleo va con su nombre entero y los módulos con su rótulo corto; lo que
 * el catálogo no conoce —el paquete, las capacidades— se queda con el nombre
 * que mandó el servidor en esa línea.
 */
function etiqueta(code: string, nombreDeLaLinea: string): string {
  const articulo = props.catalogo?.articulos.find((a) => a.code === code)
  if (!articulo) return nombreDeLaLinea
  return articulo.obligatorio ? articulo.nombre : (articulo.shortLabel ?? articulo.nombre)
}

const desglose = computed(() =>
  (props.cotizacion?.lineas ?? []).map((l) => {
    const rotulo = etiqueta(l.code, l.nombre)
    return {
      code: l.code,
      rotulo: l.cobradas > 1 ? `${l.cobradas} × ${rotulo}` : rotulo,
      importe: l.importe === null ? '—' : formatMoney(l.importe),
    }
  }),
)

/**
 * Lo que hay que pagar HOY, que es cero mientras corra la prueba. Es un cero
 * real, no el marcador de «sin dato», y por eso aquí sí se escribe la cifra.
 */
const hoyPagas = computed(() => formatMoney(0))

const MOTIVO_BLOQUEO =
  'Estamos cargando el catálogo de módulos. En cuanto termine podrás continuar con lo que ' +
  'tengas marcado.'
</script>

<template>
  <aside class="pra" aria-labelledby="resumen-h2">
    <h2 id="resumen-h2" class="pra-rotulo">Solo lo que marcaste</h2>
    <p class="pra-conteo">{{ conteo }}</p>

    <p class="pra-cifra">
      <span class="pub-num pra-num" :aria-hidden="firme ? undefined : 'true'">{{ importe }}</span>
      <span class="pra-suf">{{ sufijo }}</span>
    </p>

    <!-- La ÚNICA región viva de la pantalla. Su contenido lo compone
         `useCotizador`, que es quien sabe cuándo cada anuncio deja de ser
         cierto; `aria-atomic` porque el texto cambia de forma entera. -->
    <p class="ds-sr-only" aria-live="polite" aria-atomic="true">{{ regionViva }}</p>

    <p v-if="mensajeDeFallo" class="ds-banner ds-banner--warning pra-fallo" role="status">
      {{ mensajeDeFallo }}
    </p>

    <div v-if="desglose.length > 0" class="pra-desglose">
      <p v-for="l in desglose" :key="l.code" class="pub-row-split pra-linea">
        <span>{{ l.rotulo }}</span>
        <span>{{ l.importe }}</span>
      </p>
      <p class="pub-row-split pra-hoy">
        <span>Hoy pagas</span>
        <span>{{ hoyPagas }}</span>
      </p>
    </div>

    <p v-if="noPagas" class="pra-fuera">{{ noPagas }}</p>

    <p v-if="primerCobro" class="pub-tinted pra-cobro">
      Prueba gratis y sin tarjeta. El primer cobro sería el {{ formatDateLong(primerCobro) }}.
    </p>

    <!-- `.pub-barra-accion` no duplica el botón: lo reubica en una barra anclada
         abajo cuando la rejilla colapsa y este resumen pasa a ser el último
         bloque de la página. El importe que la acompaña sí es un eco visual del
         de arriba, y por eso va `aria-hidden`. -->
    <div class="pub-barra-accion">
      <p class="pub-barra-cifra" aria-hidden="true">
        <span class="pub-num">{{ importe }}</span>
        <span class="pub-barra-suf">{{ sufijo }}</span>
      </p>
      <button
        type="button"
        class="pra-continuar pub-focus-ring--on-accent"
        :aria-disabled="puedeContinuar ? undefined : 'true'"
        :aria-describedby="puedeContinuar ? undefined : idMotivoBloqueo"
        @click="puedeContinuar && $emit('continuar')"
      >
        Continuar
      </button>
    </div>

    <!-- El motivo es VISIBLE, no sólo para el lector: quien ve el botón apagado
         merece la misma información que quien lo oye. Y `aria-disabled` en vez
         de `disabled` para que siga siendo enfocable: un botón que se sale del
         orden de tabulación se lleva el foco al vacío. -->
    <p v-if="!puedeContinuar" :id="idMotivoBloqueo" class="pra-motivo">{{ MOTIVO_BLOQUEO }}</p>

    <RouterLink :to="{ name: 'home' }" class="pra-volver pub-focus-ring">Volver</RouterLink>
  </aside>
</template>

<style scoped>
.pra {
  min-inline-size: 0;
  position: sticky;
  top: 24px;
  padding: 24px;
  border-radius: 16px;
  border: 1px solid var(--pub-line-strong);
  background: var(--pub-surface);
  box-shadow: var(--pub-card-shadow);
}

/* En el DOM va en minúsculas y lo pone en versales el CSS: en mayúsculas
   literales varios lectores lo deletrean letra a letra. */
.pra-rotulo {
  margin: 0;
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--pub-ink-500);
}

.pra-conteo {
  margin: 12px 0 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--pub-ink-900);
}

.pra-cifra {
  margin: 10px 0 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.pra-num {
  font-size: 36px;
  color: var(--pub-ink-900);
}

.pra-suf {
  font-size: 12.5px;
  color: var(--pub-ink-600);
}

/* Sólo separación: el aspecto lo pone `.ds-banner--warning` (FE-08). */
.pra-fallo {
  margin: 12px 0 0;
}

.pra-desglose {
  margin-block-start: 18px;
}

.pra-linea {
  margin: 0;
  font-size: 12.5px;
  color: var(--pub-ink-600);
}

.pra-hoy {
  margin: 2px 0 0;
  padding-block: 10px 0;
  border-block-start-color: var(--pub-line-strong);
  font-size: 13px;
  font-weight: 600;
  color: var(--pub-ink-900);
}

.pra-fuera {
  margin: 14px 0 0;
  font-size: 12px;
  line-height: 1.55;
  color: var(--pub-ink-500);
}

.pra-cobro {
  margin: 12px 0 0;
  font-size: 12.5px;
  line-height: 1.55;
  color: var(--pub-ink-600);
}

.pra-continuar {
  margin-block-start: 18px;
  inline-size: 100%;
  min-block-size: 50px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(180deg, var(--pub-ame-600), var(--pub-ame-700));
  color: var(--pub-surface);
  font-family: inherit;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: var(--pub-btn-shadow);
}

/* `--pub-ink-700` sobre `--pub-tint-100` mide 10,12:1. El gris del prototipo
   sobre ese mismo fondo se queda en 2,23:1 y el rótulo, que es lo único que
   identifica el botón, deja de leerse. */
.pra-continuar[aria-disabled='true'] {
  background: var(--pub-tint-100);
  color: var(--pub-ink-700);
  cursor: default;
  box-shadow: none;
}

.pra-motivo {
  margin: 9px 0 0;
  font-size: 12px;
  line-height: 1.55;
  color: var(--pub-ink-600);
}

.pra-volver {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-block-start: 9px;
  min-block-size: 44px;
  border: 1px solid var(--pub-line-strong);
  border-radius: 11px;
  color: var(--pub-ink-700);
  font-size: 13.5px;
  font-weight: 500;
}

@media (width <= 900px) {
  .pra {
    position: static;
  }
}
</style>
