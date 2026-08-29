<script setup lang="ts">
import { Building2, Receipt, ShieldCheck } from 'lucide-vue-next'
import { RouterLink } from 'vue-router'

/**
 * §A — el hero.
 *
 * El kicker que había encima del `<h1>` («Plataforma de gestión veterinaria»)
 * desaparece: decía lo mismo que el titular y lo decía peor.
 *
 * «Ver los planes» ancla a `#planes` en la misma página, no navega: quien llega
 * a una landing quiere ver el precio sin cambiar de página. El ancla mueve el
 * FOCO además del scroll — con solo el hash, el foco se queda en el `<body>` y
 * la siguiente tabulación devuelve al usuario a la barra de navegación.
 */
const señales = [
  { icon: Receipt, label: 'Facturación electrónica DIAN' },
  { icon: Building2, label: 'Varias sedes' },
  { icon: ShieldCheck, label: 'Tus datos cifrados' },
]

function irAPlanes(e: Event) {
  e.preventDefault()
  const el = document.getElementById('planes')
  if (!el) return
  el.scrollIntoView({ block: 'start', behavior: 'smooth' })
  el.focus({ preventScroll: true })
}
</script>

<template>
  <section class="land-hero">
    <h1 class="land-h1">
      Tu clínica, de la sala de espera a la caja,
      <span class="land-h1-em">en un solo sitio.</span>
    </h1>

    <p class="land-sub">
      Agenda, historia clínica, hospitalización, inventario y facturación electrónica DIAN. Hecho
      para clínicas veterinarias en Colombia.
    </p>

    <div class="land-cta-row">
      <a href="#planes" class="land-cta land-cta--primary" @click="irAPlanes">Ver los planes</a>
      <RouterLink :to="{ name: 'login' }" class="land-cta land-cta--ghost">
        Ya tengo cuenta
      </RouterLink>
    </div>

    <ul class="land-trust">
      <li v-for="s in señales" :key="s.label" class="land-trust-item">
        <component :is="s.icon" :size="16" :stroke-width="1.7" aria-hidden="true" />
        {{ s.label }}
      </li>
    </ul>
  </section>
</template>

<style scoped>
.land-hero {
  position: relative;
  z-index: 1;
  max-width: 860px;
  margin: 0 auto;
  padding: clamp(28px, 6vw, 72px) clamp(20px, 5vw, 44px) clamp(36px, 6vw, 76px);
  text-align: center;
}

.land-h1 {
  font-family: 'Instrument Serif', serif;
  font-weight: 400;
  font-size: clamp(36px, 5.2vw, 62px);
  line-height: 1.1;
  letter-spacing: -0.02em;
  margin: 0;
  text-wrap: balance;
  color: var(--pub-ink-900);
}

.land-h1-em {
  font-style: italic;
  color: var(--pub-ame-700);
}

.land-sub {
  font-size: 16.5px;
  line-height: 1.55;
  color: var(--pub-ink-600);
  margin: 20px auto 0;
  max-width: 560px;
}

.land-cta-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
  margin-top: 32px;
}

/* §2.5.8: en los CTA de la landing el listón sube a 44×44 — se usan con el
   animal delante y con una sola mano. */
.land-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  padding: 0 26px;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  text-decoration: none;
}

.land-cta--primary {
  background: linear-gradient(180deg, #9333ea, #7e22ce);
  color: #fff;
  box-shadow: var(--pub-btn-shadow);
}

.land-cta--ghost {
  background: rgb(255 255 255 / 70%);
  border: 1px solid #e6ddf0;
  color: var(--pub-ink-700);
}

.land-trust {
  list-style: none;
  margin: 30px 0 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px 26px;
  font-size: 13px;
  color: var(--pub-ink-600);
}

.land-trust-item {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

.land-trust-item svg {
  color: var(--pub-ame-700);
}
</style>
