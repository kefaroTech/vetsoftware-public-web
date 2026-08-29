<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { formatMoney } from '@/composables/money'
import { calcularEstimado, sufijoCiclo } from '../composables/planPricing'
import {
  CAPACITY_UNIT_LABEL,
  CAPACITY_UNIT_LABEL_ONE,
  CICLO_LABEL,
  type Ciclo,
  type PublicPlan,
} from '../types/plans.types'

/**
 * Paso 3 — el carril «Tu selección» junto al formulario de registro.
 *
 * El `RegisterForm` **no se toca**: ni sus campos, ni su validador, ni su
 * envío. Esto va al lado, y su papel es justificar el formulario más largo del
 * producto: cuando la auxiliar llega al campo del NIT ya sabe qué está
 * comprando y por cuánto. El formulario deja de ser un peaje.
 *
 * En móvil este bloque va ANTES del formulario en el DOM, no después, y por eso
 * el orden lo fija el marcado y no un `order` de flexbox: quien navega con
 * teclado o con lector tiene que saber qué está comprando antes de empezar a
 * teclear su NIT (§1.3.2, §2.4.3).
 */
const props = defineProps<{
  plan: PublicPlan
  ciclo: Ciclo
  sedes: number
  usuarios: number
}>()

const estimado = computed(() =>
  calcularEstimado(props.plan, {
    ciclo: props.ciclo,
    sedes: props.sedes,
    usuarios: props.usuarios,
  }),
)

const linea = computed(() => {
  const sedes = `${props.sedes} ${props.sedes === 1 ? CAPACITY_UNIT_LABEL_ONE.BRANCH : CAPACITY_UNIT_LABEL.BRANCH}`
  const personas = `${props.usuarios} ${props.usuarios === 1 ? CAPACITY_UNIT_LABEL_ONE.USER : CAPACITY_UNIT_LABEL.USER}`
  return `Plan ${props.plan.name} · ${CICLO_LABEL[props.ciclo]} · ${sedes} · ${personas}`
})
</script>

<template>
  <aside class="sel-aside" aria-labelledby="seleccion-titulo">
    <details class="sel-details" open>
      <summary id="seleccion-titulo" class="sel-summary">Tu selección</summary>
      <p class="sel-line">{{ linea }}</p>
      <p class="sel-amount">
        Estimado: <strong>{{ formatMoney(estimado.subtotal) }}</strong> + IVA
        {{ sufijoCiclo(ciclo) }}
      </p>
      <p class="sel-note">Prueba gratis. Sin tarjeta. Nada de esto te compromete todavía.</p>
      <RouterLink
        :to="{
          name: 'planes',
          query: { plan: plan.code, ciclo, sedes: String(sedes), usuarios: String(usuarios) },
        }"
        class="sel-change"
      >
        Cambiar la selección
      </RouterLink>
    </details>
  </aside>
</template>

<style scoped>
.sel-aside {
  width: 100%;
}

.sel-details {
  padding: 18px 20px;
  border-radius: 14px;
  border: 1px solid var(--pub-ame-300);
  background: rgb(255 255 255 / 85%);
}

.sel-summary {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--pub-ame-700);
  cursor: pointer;
  min-height: 24px;
  display: flex;
  align-items: center;
}

.sel-line {
  margin: 12px 0 0;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.5;
  color: var(--pub-ink-900);
}

.sel-amount {
  margin: 8px 0 0;
  font-size: 13.5px;
  color: var(--pub-ink-700);
  font-variant-numeric: tabular-nums;
}

.sel-note {
  margin: 8px 0 0;
  font-size: 12px;
  line-height: 1.55;
  color: var(--pub-ink-600);
}

.sel-change {
  display: inline-flex;
  align-items: center;
  min-height: 40px;
  margin-top: 12px;
  font-size: 13px;
  font-weight: 600;
  color: var(--pub-ame-700);
}
</style>
