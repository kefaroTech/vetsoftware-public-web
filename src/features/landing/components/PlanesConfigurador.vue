<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useId, watch } from 'vue'
import { formatMoney } from '@/composables/money'
import CicloFieldset from './CicloFieldset.vue'
import {
  calcularEstimado,
  importeEstimado,
  precioBase,
  sufijoCiclo,
  textoSinPrecio,
} from '../composables/planPricing'
import type { Ciclo, PublicPlan } from '../types/plans.types'

/**
 * Paso 2 — el configurador ligero de `/planes`.
 *
 * **No es el configurador del backend.** `POST /configurator/resolve` es público
 * pero devuelve `catalogItemId` y `quantity`, sin nombre ni precio, y no existe
 * ningún endpoint público con el que convertir un id en «Agenda» ni en una
 * cifra. Esto son tres preguntas, ninguna obligatoria, todas con valor por
 * defecto.
 *
 * ── El anuncio en vivo, y por qué es así de estrecho ───────────────────────
 * `aria-live="polite"` va sobre EL IMPORTE, no sobre el bloque entero: si
 * envolviera el bloque, cada tecla en «personas» dispararía la lectura completa
 * del resumen. Y el recálculo anunciado lleva 400 ms de retardo, para que
 * teclear «12» no anuncie primero «1» y luego «12».
 *
 * El valor de los controles se actualiza al instante; lo único que espera es lo
 * que se ANUNCIA. Separarlos es lo que evita tener que elegir entre una interfaz
 * perezosa y un lector que interrumpe.
 */
const props = defineProps<{ plans: PublicPlan[] }>()

defineEmits<(e: 'continuar') => void>()

const planCode = defineModel<string>('planCode', { required: true })
const ciclo = defineModel<Ciclo>('ciclo', { required: true })
const sedes = defineModel<number>('sedes', { required: true })
const usuarios = defineModel<number>('usuarios', { required: true })

const uid = useId()
const idSedes = `${uid}-sedes`
const idUsuarios = `${uid}-usuarios`
const nombrePlanes = `${uid}-plan`

const ANUNCIO_MS = 400

const plan = computed<PublicPlan | null>(
  () => props.plans.find((p) => p.code === planCode.value) ?? props.plans[0] ?? null,
)

const estimado = computed(() =>
  plan.value
    ? calcularEstimado(plan.value, {
        ciclo: ciclo.value,
        sedes: sedes.value,
        usuarios: usuarios.value,
      })
    : null,
)

/** El importe que se PINTA. Cambia en cuanto cambia la selección. */
const importe = computed(() => (estimado.value ? importeEstimado(estimado.value.subtotal) : '—'))

/**
 * Por qué no hay cifra, cuando no la hay. El `—` sin explicación se lee como un
 * fallo de carga; esto dice qué falta, en qué ciclo y qué se puede hacer.
 */
const avisoSinPrecio = computed(() =>
  estimado.value ? textoSinPrecio(estimado.value.sinPrecio, ciclo.value) : null,
)

/** El importe que se ANUNCIA. Va 400 ms por detrás del anterior, a propósito. */
const importeAnunciado = ref(importe.value)
let temporizador: ReturnType<typeof setTimeout> | null = null

watch(importe, (v) => {
  if (temporizador) clearTimeout(temporizador)
  temporizador = setTimeout(() => {
    importeAnunciado.value = v
  }, ANUNCIO_MS)
})

onBeforeUnmount(() => {
  if (temporizador) clearTimeout(temporizador)
})

/**
 * El contrato declara `trialDays` opcional: hay artículos sin
 * `default_trial_days`. Sin esto la lista rotularía «null días» en cuanto el
 * catálogo venga del endpoint.
 */
function textoPrueba(dias: number | null): string {
  return dias === null ? 'Sin prueba' : `${dias} días`
}

/** Los `<input type="number">` devuelven cadena vacía al borrarlos: nunca por debajo de 1. */
function normalizar(valor: unknown): number {
  const n = Math.trunc(Number(valor))
  return Number.isFinite(n) && n >= 1 ? n : 1
}
</script>

<template>
  <div class="pl-grid">
    <div class="pl-form ds-stack ds-stack--18">
      <fieldset class="pl-fieldset">
        <legend class="pl-legend">¿Qué plan te encaja?</legend>
        <div class="pl-plan-opts">
          <label
            v-for="p in plans"
            :key="p.code"
            class="pl-plan-opt"
            :class="{ 'is-on': planCode === p.code }"
          >
            <input v-model="planCode" type="radio" :name="nombrePlanes" :value="p.code" />
            <span class="pl-plan-body">
              <span class="pl-plan-name">
                {{ p.name }}
                <span v-if="p.recommended" class="pub-badge">La que más eligen</span>
              </span>
              <span class="pl-plan-tag">{{ p.tagline }}</span>
              <span class="pl-plan-from">
                desde {{ formatMoney(precioBase(p, ciclo)) }} + IVA {{ sufijoCiclo(ciclo) }}
              </span>
            </span>
          </label>
        </div>
      </fieldset>

      <CicloFieldset v-model="ciclo" />

      <div class="pl-numbers">
        <div class="pl-number">
          <label :for="idSedes" class="pl-label">¿Cuántas sedes tienes?</label>
          <input
            :id="idSedes"
            class="pl-input"
            type="number"
            min="1"
            step="1"
            inputmode="numeric"
            :value="sedes"
            @input="sedes = normalizar(($event.target as HTMLInputElement).value)"
          />
        </div>
        <div class="pl-number">
          <label :for="idUsuarios" class="pl-label">¿Cuántas personas van a usarlo?</label>
          <input
            :id="idUsuarios"
            class="pl-input"
            type="number"
            min="1"
            step="1"
            inputmode="numeric"
            :value="usuarios"
            @input="usuarios = normalizar(($event.target as HTMLInputElement).value)"
          />
        </div>
      </div>
    </div>

    <aside class="pl-resumen" aria-labelledby="estimado-titulo">
      <h2 id="estimado-titulo" class="pl-resumen-title">Estimado</h2>
      <p class="pl-resumen-amount">
        <span class="pub-price">{{ importe }}</span>
        <span class="pl-resumen-suffix">+ IVA {{ sufijoCiclo(ciclo) }}</span>
      </p>
      <p class="ds-sr-only" aria-live="polite">
        Estimado: {{ importeAnunciado }} más IVA {{ sufijoCiclo(ciclo) }}.
      </p>

      <ul v-if="estimado" class="pl-breakdown">
        <li>
          <span>Plan {{ plan?.name }}</span
          ><span>{{ formatMoney(estimado.base) }}</span>
        </li>
        <!-- La fila se pinta aunque no haya precio: la sede adicional se está
             pidiendo igual, y esconderla sería un total que no cuadra con la
             selección. Lo que cambia es la cifra, que pasa a `—`. -->
        <li v-if="estimado.sedesCobradas > 0">
          <span>{{ estimado.sedesCobradas }} sede(s) adicional(es)</span>
          <span>{{ importeEstimado(estimado.sedesExtra) }}</span>
        </li>
        <li v-if="estimado.usuariosCobrados > 0">
          <span>{{ estimado.usuariosCobrados }} persona(s) adicional(es)</span>
          <span>{{ importeEstimado(estimado.usuariosExtra) }}</span>
        </li>
      </ul>

      <!-- `role="status"` y no `alert`: no ha fallado nada, es lo que esa
           combinación vale hoy. Va JUNTO al desglose y no al pie, porque explica
           el `—` que se acaba de leer. -->
      <p v-if="avisoSinPrecio" class="ds-banner ds-banner--warning pl-sinprecio" role="status">
        {{ avisoSinPrecio }}
      </p>

      <p class="pl-resumen-note">
        Es un cálculo orientativo con los precios de lista. El precio exacto de tu clínica lo ves
        antes de confirmar, sin compromiso.
      </p>
      <p class="pl-resumen-note">Prueba gratis. Sin tarjeta.</p>

      <!-- §6.2 — el detalle de la prueba va PLEGADO aquí y desplegado (y
           obligatorio) en el paso de contratación, con las fechas reales. La
           prueba vence por línea, así que aquí no se puede decir «30 días» a
           secas: sería falso para los módulos que tienen 14. -->
      <details v-if="plan" class="pl-trial">
        <summary class="pl-trial-summary">¿Cuánto dura la prueba de cada módulo?</summary>
        <ul class="pl-trial-list">
          <li v-for="inc in plan.includes" :key="inc.code">
            <span>{{ inc.name }}</span
            ><span>{{ textoPrueba(inc.trialDays) }}</span>
          </li>
        </ul>
        <p class="pl-trial-note">
          Cada módulo tiene su propia prueba y no terminan todas el mismo día. Verás las fechas
          exactas antes de confirmar.
        </p>
      </details>

      <button type="button" class="pl-continue" @click="$emit('continuar')">
        Continuar con {{ plan?.name }}
      </button>
    </aside>
  </div>
</template>

<style scoped>
.pl-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 26px;
  align-items: start;
}

.pl-fieldset {
  border: none;
  margin: 0;
  padding: 0;
  min-width: 0;
}

.pl-legend,
.pl-label {
  padding: 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--pub-ink-700);
  letter-spacing: 0.01em;
}

.pl-plan-opts {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 10px;
}

.pl-plan-opt {
  display: flex;
  align-items: flex-start;
  gap: 11px;
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid var(--pub-line);
  background: var(--pub-surface);
  cursor: pointer;
}

.pl-plan-opt.is-on {
  border-color: var(--pub-ame-600);
}

.pl-plan-opt input {
  accent-color: var(--pub-ame-600);
  width: 16px;
  height: 16px;
  margin-top: 3px;
}

.pl-plan-body {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.pl-plan-name {
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 15px;
  font-weight: 700;
  color: var(--pub-ink-900);
}

.pl-plan-tag {
  font-size: 12.5px;
  color: var(--pub-ink-600);
}

.pl-plan-from {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--pub-ame-700);
}

.pl-numbers {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 15px;
}

.pl-number {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.pl-input {
  min-height: 44px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid var(--pub-line);
  background: var(--pub-surface);
  font-family: inherit;
  font-size: 14px;
  color: var(--pub-ink-900);
}

.pl-resumen {
  position: sticky;
  top: 20px;
  padding: 22px 20px;
  border-radius: 14px;
  border: 1px solid var(--pub-line);
  background: var(--pub-surface);
  box-shadow: var(--pub-card-shadow);
}

.pl-resumen-title {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--pub-ink-500);
}

.pl-resumen-amount {
  margin: 10px 0 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.pl-resumen-suffix {
  font-size: 12.5px;
  color: var(--pub-ink-600);
}

.pl-breakdown {
  list-style: none;
  margin: 16px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12.5px;
  color: var(--pub-ink-600);
}

.pl-breakdown li {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-variant-numeric: tabular-nums;
}

/* Solo separación: el aspecto entero lo pone `.ds-banner--warning`, que no se
   reescribe aquí (FE-08). */
.pl-sinprecio {
  margin: 14px 0 0;
}

.pl-resumen-note {
  margin: 14px 0 0;
  font-size: 12px;
  line-height: 1.55;
  color: var(--pub-ink-600);
}

.pl-trial {
  margin-top: 12px;
  font-size: 12px;
  color: var(--pub-ink-600);
}

.pl-trial-summary {
  display: flex;
  align-items: center;
  min-height: 32px;
  font-weight: 600;
  color: var(--pub-ame-700);
  cursor: pointer;
}

.pl-trial-list {
  list-style: none;
  margin: 6px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.pl-trial-list li {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-variant-numeric: tabular-nums;
}

.pl-trial-note {
  margin: 8px 0 0;
  line-height: 1.55;
}

.pl-continue {
  margin-top: 18px;
  width: 100%;
  min-height: 48px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(180deg, var(--pub-ame-600), var(--pub-ame-700));
  color: var(--pub-surface);
  font-family: inherit;
  font-size: 14.5px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: var(--pub-btn-shadow);
}

@media (width <= 900px) {
  .pl-grid {
    grid-template-columns: 1fr;
  }

  .pl-resumen {
    position: static;
  }

  .pl-numbers {
    grid-template-columns: 1fr;
  }
}
</style>
