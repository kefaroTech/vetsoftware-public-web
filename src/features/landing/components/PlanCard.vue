<script setup lang="ts">
import { Check } from 'lucide-vue-next'
import { computed, useId } from 'vue'
import { RouterLink } from 'vue-router'
import { formatMoney } from '@/composables/money'
import { ahorroAnual, precioBase, sufijoCiclo } from '../composables/planPricing'
import {
  CAPACITY_UNIT_LABEL,
  CAPACITY_UNIT_LABEL_ONE,
  type Ciclo,
  type PublicPlan,
} from '../types/plans.types'

/**
 * Una tarjeta de plan.
 *
 * Reglas que la forma tiene que cumplir, y por qué:
 *
 *  - Es un `<article>` con `<h3>` y **un único** control. Nunca un `RouterLink`
 *    que envuelva la tarjeta entera: el nombre accesible de ese enlace sería la
 *    concatenación del título, el precio, los cinco puntos y el CTA.
 *  - El CTA **nombra el plan** («Empezar con Esencial»), no dice «Elegir». En una
 *    lista de enlaces —como la que produce un lector de pantalla— tres enlaces
 *    llamados «Elegir» son indistinguibles.
 *  - La recomendada lleva insignia con TEXTO VISIBLE, no solo un borde de color:
 *    `--pub-line` mide 1,23:1 contra blanco, muy por debajo del 3:1 que §1.4.11
 *    exige a un indicador de estado, y §1.4.1 prohíbe que el color sea el único
 *    canal. El `<h3>` la apunta con `aria-describedby`.
 *  - El precio se rotula **siempre «desde»**: es contenido del front, no una
 *    cifra vinculante.
 */
const props = defineProps<{
  plan: PublicPlan
  ciclo: Ciclo
}>()

const emit = defineEmits<(e: 'elegir', plan: PublicPlan) => void>()

const uid = useId()
const badgeId = `${uid}-badge`

const precio = computed(() => precioBase(props.plan, props.ciclo))
const ahorro = computed(() => ahorroAnual(props.plan))

/** Los cuatro o cinco puntos de la tarjeta: capacidades primero, módulos después. */
const puntos = computed<string[]>(() => {
  const capacidades = props.plan.capacities.map((c) => {
    const uno = c.included === 1
    const etiqueta = uno ? CAPACITY_UNIT_LABEL_ONE[c.unit] : CAPACITY_UNIT_LABEL[c.unit]
    return `${c.included} ${etiqueta} ${uno ? 'incluida' : 'incluidas'}`
  })
  return [...capacidades, ...props.plan.includes.map((i) => i.name)]
})
</script>

<template>
  <article
    class="pub-plan-card"
    :class="{ 'pub-plan-card--featured': plan.recommended }"
    data-testid="plan-card"
  >
    <p v-if="plan.recommended" :id="badgeId" class="pub-badge">La que más eligen</p>

    <h3 class="land-plan-name" :aria-describedby="plan.recommended ? badgeId : undefined">
      {{ plan.name }}
    </h3>
    <p class="land-plan-tagline">{{ plan.tagline }}</p>

    <p class="land-plan-price">
      <span class="land-plan-desde">desde</span>
      <span class="pub-price">{{ formatMoney(precio) }}</span>
      <span class="land-plan-suffix">+ IVA {{ sufijoCiclo(ciclo) }}</span>
    </p>
    <p v-if="ciclo === 'ANUAL'" class="land-plan-save">
      {{ formatMoney(plan.annualFromAmount) }} al año — ahorras {{ formatMoney(ahorro) }}
    </p>

    <ul class="land-plan-list">
      <li v-for="p in puntos" :key="p">
        <Check :size="14" :stroke-width="2" aria-hidden="true" />
        <span>{{ p }}</span>
      </li>
    </ul>

    <RouterLink
      :to="{ name: 'planes', query: { plan: plan.code, ciclo } }"
      class="land-plan-cta"
      @click="emit('elegir', plan)"
    >
      Empezar con {{ plan.name }}
    </RouterLink>
  </article>
</template>

<style scoped>
.land-plan-name {
  margin: 0;
  font-size: 19px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--pub-ink-900);
}

.land-plan-tagline {
  margin: -8px 0 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--pub-ink-600);
}

.land-plan-price {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.land-plan-desde {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--pub-ink-500);
}

.land-plan-suffix {
  font-size: 12.5px;
  color: var(--pub-ink-600);
}

.land-plan-save {
  margin: -8px 0 0;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--pub-ok-tx);
}

.land-plan-list {
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
  margin-top: auto;
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
</style>
