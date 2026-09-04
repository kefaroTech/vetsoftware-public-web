<script setup lang="ts">
import { Check } from 'lucide-vue-next'
import { computed, useId } from 'vue'
import { RouterLink } from 'vue-router'
import { formatMoney } from '@/composables/money'
import type { ArticuloCatalogo } from '@/features/asistente/types/catalogo.types'
import { importeEstimado, precioBase, sufijoCiclo } from '../composables/planPricing'
import type { Ciclo, PublicPlan } from '../types/plans.types'

/**
 * Una combinación frecuente. **Es un atajo de selección, no un paquete cerrado**:
 * lo que el CTA hace es marcar de golpe unos módulos que después se pueden quitar.
 *
 * Reglas que la forma tiene que cumplir, y por qué:
 *
 *  - Es un `<article>` con `<h3>` y **un único** control. Nunca un `RouterLink`
 *    que envuelva la tarjeta entera: el nombre accesible de ese enlace sería la
 *    concatenación del título, el precio, los puntos y el CTA.
 *  - El CTA dice lo mismo en todas las tarjetas, así que lo que las distingue en
 *    la lista de enlaces de un lector es el `aria-describedby` al `<h3>`. Un
 *    `aria-label` que nombrara la combinación rompería §2.5.3: el nombre
 *    accesible dejaría de contener el texto visible.
 *  - La recomendada lleva insignia con TEXTO VISIBLE, no solo un borde de color:
 *    `--pub-line` mide 1,23:1 contra blanco, muy por debajo del 3:1 que §1.4.11
 *    exige a un indicador de estado, y §1.4.1 prohíbe que el color sea el único
 *    canal.
 */
const props = defineProps<{
  plan: PublicPlan
  ciclo: Ciclo
  /**
   * Sale de `packs[].recommended` del catálogo del servidor, no de
   * `PublicPlan.recommended`, que es una decisión editorial del front.
   */
  recomendada: boolean
  /** Los módulos del paquete, en el orden del catálogo y con su precio. */
  modulos: ArticuloCatalogo[]
  /** Lo que costarían el núcleo y esos módulos sueltos; `null` si no se sabe. */
  sumaSuelta: number | null
}>()

const emit = defineEmits<(e: 'marcar') => void>()

const uid = useId()
const badgeId = `${uid}-badge`
const tituloId = `${uid}-titulo`

const precio = computed(() => precioBase(props.plan, props.ciclo))

const conteo = computed<string | null>(() => {
  const n = props.modulos.length
  if (n === 0) return null
  return `Núcleo + ${n} ${n === 1 ? 'módulo' : 'módulos'}`
})

/**
 * El aviso preventivo del modelo híbrido: quitar una casilla rompe la
 * coincidencia con el paquete, se pierde su descuento y el precio SUBE. Sin
 * decirlo antes, ese salto se lee como un error de cálculo.
 *
 * <p>Con un solo módulo no hay paquete que romper, y si la suma no supera al
 * precio de la combinación no hay descuento que anunciar.
 */
const avisoDescuento = computed<string | null>(() => {
  const n = props.modulos.length
  const suelto = props.sumaSuelta
  if (n < 2 || suelto === null || suelto <= precio.value) return null
  return (
    `Los ${n} juntos salen más baratos: ${formatMoney(precio.value)} en vez de ` +
    `${formatMoney(suelto)}. Si quitas uno, se cobran por separado.`
  )
})
</script>

<template>
  <article
    class="pub-plan-card"
    :class="{ 'pub-plan-card--featured': recomendada }"
    data-testid="plan-card"
  >
    <p v-if="recomendada" :id="badgeId" class="pub-badge">La que más eligen</p>

    <h3 :id="tituloId" class="land-plan-name" :aria-describedby="recomendada ? badgeId : undefined">
      {{ plan.name }}
    </h3>
    <p class="land-plan-tagline">{{ plan.tagline }}</p>

    <p class="land-plan-price">
      <span v-if="conteo" class="land-plan-conteo" data-testid="plan-card-conteo">
        {{ conteo }}
      </span>
      <span class="pub-price">{{ formatMoney(precio) }}</span>
      <span class="land-plan-suffix">+ IVA {{ sufijoCiclo(ciclo) }}</span>
    </p>

    <p v-if="avisoDescuento" class="land-plan-descuento" data-testid="plan-card-descuento">
      {{ avisoDescuento }}
    </p>

    <ul class="land-plan-list">
      <li v-for="m in modulos" :key="m.code">
        <Check :size="14" :stroke-width="2" aria-hidden="true" />
        <span>{{ m.nombre }} · {{ importeEstimado(m.importe) }}</span>
      </li>
      <li>
        <Check :size="14" :stroke-width="2" aria-hidden="true" />
        <span>Quita en el siguiente paso lo que no uses</span>
      </li>
    </ul>

    <RouterLink
      :to="{ name: 'planes', query: { plan: plan.code, ciclo } }"
      class="land-plan-cta"
      :class="{ 'land-plan-cta--suave': !recomendada }"
      :aria-describedby="tituloId"
      data-testid="plan-card-cta"
      @click="emit('marcar')"
    >
      Marcar los de {{ plan.name }}
    </RouterLink>
  </article>
</template>

<style scoped>
/* Cada hijo ocupa una fila FIJA del `subgrid` de `.pub-plan-card`. Explícito y
   no por orden de aparición: la insignia solo la lleva la recomendada, y con
   colocación automática su ausencia subiría título, subtítulo y precio una fila
   entera, que es justo el descuadre que estas filas vienen a corregir. */
.pub-badge {
  grid-row: 1;
}

.land-plan-name {
  grid-row: 2;
  margin: 0;
  font-size: 19px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--pub-ink-900);
}

.land-plan-tagline {
  grid-row: 3;
  margin: -8px 0 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--pub-ink-600);
}

.land-plan-price {
  grid-row: 4;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.land-plan-conteo {
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--pub-ink-500);
}

.land-plan-suffix {
  font-size: 12.5px;
  color: var(--pub-ink-600);
}

.land-plan-descuento {
  grid-row: 5;
  margin: -6px 0 0;
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--pub-ink-500);
}

.land-plan-list {
  grid-row: 6;
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13.5px;
  color: var(--pub-ink-700);
}

.land-plan-list li {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  line-height: 1.45;
}

.land-plan-list svg {
  color: var(--pub-ame-700);
  flex-shrink: 0;
  margin-top: 2px;
}

.land-plan-cta {
  grid-row: 7;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 46px;
  padding: 0 20px;
  border-radius: 10px;
  font-size: 14.5px;
  font-weight: 600;
  text-decoration: none;
  background: linear-gradient(180deg, var(--pub-ame-600), var(--pub-ame-700));
  color: var(--pub-surface);
  box-shadow: var(--pub-btn-shadow);
}

.land-plan-cta--suave {
  border: 1px solid var(--pub-ame-600);
  background: var(--pub-surface);
  color: var(--pub-ame-700);
  box-shadow: none;
}
</style>
