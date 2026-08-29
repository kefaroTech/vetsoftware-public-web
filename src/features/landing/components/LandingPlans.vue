<script setup lang="ts">
import { RefreshCw, TriangleAlert } from 'lucide-vue-next'
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import CicloFieldset from './CicloFieldset.vue'
import PlanCard from './PlanCard.vue'
import { MONEDA_DE_FACTURACION } from '../composables/planPricing'
import type { Ciclo, PublicPlan } from '../types/plans.types'

/**
 * §D — la sección de planes de la landing.
 *
 * Los tres estados están escritos, no solo el feliz:
 *
 *  - Si `fetchPlans()` falla, la sección **no desaparece**: se pinta el error con
 *    reintento y el CTA de registro sigue vivo más abajo. Una landing sin
 *    precios convierte peor; una landing rota no convierte nada.
 *  - El error de red se pinta ANTES que el vacío: «no hay planes» y «no pudimos
 *    cargar los planes» son cosas distintas y se dicen distinto.
 *
 * Lo que NO va aquí: una tabla comparativa de cuarenta filas con checks y
 * cruces. Si hace falta, va detrás del enlace a `/planes`.
 */
defineProps<{
  plans: PublicPlan[]
  loading: boolean
  error: unknown
}>()

const emit = defineEmits<{
  (e: 'elegir', plan: PublicPlan, ciclo: Ciclo): void
  (e: 'reintentar'): void
}>()

const ciclo = ref<Ciclo>('MENSUAL')
</script>

<template>
  <section id="planes" class="pub-section" aria-labelledby="planes-titulo" tabindex="-1">
    <div class="pub-section-head">
      <h2 id="planes-titulo">Planes</h2>
      <p>Elige por el tamaño de tu clínica, no por una lista de funciones.</p>
    </div>

    <div class="land-plans-switch">
      <CicloFieldset v-model="ciclo" />
    </div>

    <div v-if="error" class="pub-error land-plans-state" role="alert">
      <p class="land-state-title">
        <TriangleAlert :size="15" :stroke-width="1.8" aria-hidden="true" />
        No pudimos cargar los planes
      </p>
      <p class="land-state-text">
        Puedes crear tu cuenta igualmente y ver el precio exacto antes de confirmar, sin compromiso.
      </p>
      <button type="button" class="land-retry" @click="emit('reintentar')">
        <RefreshCw :size="14" :stroke-width="1.8" aria-hidden="true" />
        Volver a intentarlo
      </button>
    </div>

    <p v-else-if="loading" class="land-plans-state land-plans-loading">Cargando los planes…</p>

    <p v-else-if="plans.length === 0" class="land-plans-state land-plans-loading">
      Todavía no hay planes publicados. Escríbenos a
      <a href="mailto:soporte@vetsoftware.co">soporte@vetsoftware.co</a> y te contamos.
    </p>

    <div v-else class="land-plans-grid">
      <PlanCard
        v-for="p in plans"
        :key="p.code"
        :plan="p"
        :ciclo="ciclo"
        @elegir="emit('elegir', p, ciclo)"
      />
    </div>

    <!-- La moneda sale de UNA constante, no de la respuesta ni de esta frase: ver
         `MONEDA_DE_FACTURACION`. Antes estaba escrita a mano aquí y en ningún otro sitio, así que
         `/planes` —la otra pantalla pública con precios— no la decía en absoluto y sus cifras se
         leían como un `$` sin país. -->
    <p class="land-plans-note">
      Los precios son orientativos, en {{ MONEDA_DE_FACTURACION }}, y no incluyen IVA. El precio
      exacto para tu clínica lo ves antes de confirmar, sin compromiso y sin tarjeta.
    </p>

    <p class="land-plans-more">
      <RouterLink :to="{ name: 'planes' }">Comparar los tres planes en detalle</RouterLink>
    </p>
  </section>
</template>

<style scoped>
.land-plans-switch {
  display: flex;
  justify-content: center;
  margin-bottom: 26px;
}

.land-plans-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
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
  margin: 26px auto 0;
  max-width: 640px;
  text-align: center;
  font-size: 12.5px;
  line-height: 1.6;
  color: var(--pub-ink-600);
}

.land-plans-more {
  margin: 14px 0 0;
  text-align: center;
  font-size: 13.5px;
}

.land-plans-more :deep(a),
.land-plans-more a {
  color: var(--pub-ame-700);
  font-weight: 600;
}

#planes:focus {
  outline: none;
}

@media (width <= 980px) {
  .land-plans-grid {
    grid-template-columns: 1fr;
  }
}
</style>
