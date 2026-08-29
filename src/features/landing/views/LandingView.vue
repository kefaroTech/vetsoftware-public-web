<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useContratacion } from '@/features/contratacion/composables/useContratacion'
import LandingDayFlow from '../components/LandingDayFlow.vue'
import LandingFaq from '../components/LandingFaq.vue'
import LandingFinalCta from '../components/LandingFinalCta.vue'
import LandingFooter from '../components/LandingFooter.vue'
import LandingHero from '../components/LandingHero.vue'
import LandingPlans from '../components/LandingPlans.vue'
import LandingTopbar from '../components/LandingTopbar.vue'
import LandingValueGrid from '../components/LandingValueGrid.vue'
import ResumeIntentBanner from '../components/ResumeIntentBanner.vue'
import { usePlanes } from '../composables/usePlanes'
import type { Ciclo, PublicPlan } from '../types/plans.types'

/**
 * La landing comercial.
 *
 * ── Por qué esta vista es tan corta ────────────────────────────────────────
 * La versión anterior eran 468 líneas con 317 de CSS contra 28 de script, y ese
 * es exactamente el perfil que revienta `maxStyleMinusScript: 0` del presupuesto
 * de CSS — un techo de trinquete que se pone rojo **para todo el repo**. Una
 * landing es tentación pura de CSS nuevo, así que se parte en componentes desde
 * el primer commit, no «cuando crezca». Aquí solo queda composición y estados.
 *
 * ── Lo que se eliminó y por qué ────────────────────────────────────────────
 * El `@mousemove` que recomputaba un `radial-gradient` en cada píxel. Era el
 * mayor coste de INP de la página —y la landing es donde el INP se mide— y la
 * guarda global de `prefers-reduced-motion` **no lo apagaba**: esa guarda actúa
 * sobre `animation`/`transition`, y aquello era un `:style` reactivo que la
 * regla no ve. Los blobs y la cuadrícula se quedan: son CSS, y `.pub-drift` sí
 * cae bajo la guarda.
 *
 * Y las dos tarjetas-enlace de la página de decisión. Un `RouterLink` que
 * envuelve icono, kicker, título, descripción y CTA tiene como nombre accesible
 * la concatenación de los cinco textos: el lector anunciaba un párrafo entero
 * como si fuera el rótulo del botón. Sus dos acciones viven ahora en el CTA del
 * hero y en la barra superior, que es donde las busca quien llega de una
 * búsqueda.
 */
const router = useRouter()
const { plans, loading, error, refresh, findByCode } = usePlanes()
const { vigente, elegir, limpiar } = useContratacion()

/** Se oculta al actuar sobre ella; no se vuelve a mostrar en esta visita. */
const bandaCerrada = ref(false)

const intencionParaBanda = computed(() => (bandaCerrada.value ? null : vigente.value))

const planDeLaBanda = computed(() => {
  const i = intencionParaBanda.value
  if (!i) return null
  const plan = findByCode(i.planCode)
  return plan ? { plan, intencion: i } : null
})

/**
 * Elegir desde una tarjeta guarda la intención con las cantidades que ya
 * hubiera (o los mínimos), y el propio enlace de la tarjeta lleva a `/planes`,
 * donde se ajustan. Guardar aquí y no allí es lo que hace que la elección
 * sobreviva a cerrar el navegador antes de llegar al configurador.
 */
function onElegir(plan: PublicPlan, ciclo: Ciclo) {
  const previa = vigente.value
  elegir(plan, ciclo, previa?.sedes ?? 1, previa?.usuarios ?? 1)
}

function seguirDondeLoDejaste() {
  const i = vigente.value
  bandaCerrada.value = true
  if (!i) return
  void router.push({ name: 'planes', query: { plan: i.planCode, ciclo: i.ciclo } })
}

function empezarDeNuevo() {
  bandaCerrada.value = true
  limpiar()
}
</script>

<template>
  <div class="pub-scope land-stage">
    <a class="pub-skip" href="#contenido">Saltar al contenido</a>

    <div class="land-decor" aria-hidden="true">
      <div class="pub-blob pub-drift land-blob-a" />
      <div class="pub-blob pub-drift land-blob-b" />
      <div class="pub-grid-bg" />
    </div>

    <LandingTopbar />

    <ResumeIntentBanner
      v-if="planDeLaBanda"
      :plan-nombre="planDeLaBanda.plan.name"
      :sedes="planDeLaBanda.intencion.sedes"
      :usuarios="planDeLaBanda.intencion.usuarios"
      @seguir="seguirDondeLoDejaste"
      @empezar-de-nuevo="empezarDeNuevo"
    />

    <main id="contenido" class="land-main" tabindex="-1">
      <LandingHero />
      <LandingValueGrid />
      <LandingDayFlow />
      <LandingPlans
        :plans="plans"
        :loading="loading"
        :error="error"
        @elegir="onElegir"
        @reintentar="refresh"
      />
      <LandingFaq />
      <LandingFinalCta />
    </main>

    <LandingFooter />
  </div>
</template>

<style scoped>
.land-stage {
  position: relative;
  width: 100%;
  min-height: 100vh;
  overflow-x: hidden;
  background: radial-gradient(ellipse at top, #f3e8ff 0%, #f5f1fa 48%, #ede8f4 100%);
  color: var(--pub-ink-900);
}

.land-decor {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.land-blob-a {
  top: -160px;
  right: -120px;
  width: 480px;
  height: 480px;
  background: radial-gradient(circle, rgb(192 132 252 / 30%), transparent 60%);
}

.land-blob-b {
  bottom: -180px;
  left: -140px;
  width: 520px;
  height: 520px;
  animation-delay: -7s;
  background: radial-gradient(circle, rgb(147 51 234 / 20%), transparent 62%);
}

.land-main {
  position: relative;
  z-index: 1;
}

.land-main:focus {
  outline: none;
}
</style>
