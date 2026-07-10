<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'

/** Página de inicio / decisión (handoff §6). Glow que sigue el cursor + blobs + grid. */
const stage = ref<HTMLElement | null>(null)
const pointer = reactive({ x: 0.5, y: 0.35 })
const hover = ref<'' | 'login' | 'signup'>('')

function onMove(e: MouseEvent) {
  const el = stage.value
  if (!el) return
  const r = el.getBoundingClientRect()
  pointer.x = (e.clientX - r.left) / r.width
  pointer.y = (e.clientY - r.top) / r.height
}

const glow = computed(() => {
  const x = 50 + (pointer.x - 0.5) * 40
  const y = 30 + (pointer.y - 0.5) * 30
  return `radial-gradient(560px circle at ${x}% ${y}%, rgba(168,85,247,.18), transparent 62%)`
})

const trust = [
  { icon: 'mdi-office-building-outline', label: 'Multiclínica' },
  { icon: 'mdi-account-multiple', label: 'Gestión de equipo' },
  { icon: 'mdi-shield-check-outline', label: 'Datos cifrados' },
]
</script>

<template>
  <div ref="stage" class="pub-scope land-stage" @mousemove="onMove">
    <div class="land-glow" :style="{ background: glow }" />
    <div
      class="pub-blob pub-drift"
      style="top: -160px; right: -120px; width: 480px; height: 480px; animation-delay: 0s;
             background: radial-gradient(circle, rgba(192,132,252,.3), transparent 60%)"
    />
    <div
      class="pub-blob pub-drift"
      style="bottom: -180px; left: -140px; width: 520px; height: 520px; animation-delay: -7s;
             background: radial-gradient(circle, rgba(147,51,234,.2), transparent 62%)"
    />
    <div
      class="pub-blob pub-drift"
      style="top: 40%; left: 52%; width: 340px; height: 340px; animation-delay: -3.5s;
             background: radial-gradient(circle, rgba(216,180,254,.28), transparent 60%)"
    />
    <div class="pub-grid-bg" />

    <header class="land-topbar">
      <div class="land-brand">
        <span class="land-brand-mark"><v-icon size="17">mdi-paw</v-icon></span>
        <span class="land-brand-word">VetSoftware</span>
      </div>
      <RouterLink :to="{ name: 'login' }" class="land-login-btn">
        Iniciar sesión <v-icon size="13">mdi-arrow-right</v-icon>
      </RouterLink>
    </header>

    <main class="land-main">
      <div class="land-eyebrow pub-reveal" style="animation-delay: 0.05s">
        <v-icon size="13">mdi-star-four-points-outline</v-icon> Plataforma de gestión veterinaria
      </div>

      <h1 class="land-h1 pub-reveal" style="animation-delay: 0.12s">
        Todo tu centro veterinario,<br />
        <span class="land-h1-em">en un solo panel.</span>
      </h1>

      <p class="land-sub pub-reveal" style="animation-delay: 0.19s">
        Administra clínicas, empleados, membresías y permisos desde una sola plataforma clara y
        segura. Comienza en segundos.
      </p>

      <div class="land-cards pub-reveal" style="animation-delay: 0.28s">
        <RouterLink
          :to="{ name: 'signup' }"
          class="land-card land-card--primary"
          :class="{ 'is-active': hover === 'signup' }"
          @mouseenter="hover = 'signup'"
          @mouseleave="hover = ''"
        >
          <div class="land-card-glow" />
          <div class="land-card-icon">
            <v-icon size="20">mdi-star-four-points-outline</v-icon>
          </div>
          <div class="land-card-kicker">Nuevo aquí</div>
          <div class="land-card-title">Crear cuenta</div>
          <div class="land-card-desc">Registra tu centro y empieza a operar hoy mismo.</div>
          <div class="land-card-cta">
            Registrarme <v-icon size="14" class="land-card-arrow">mdi-arrow-right</v-icon>
          </div>
        </RouterLink>

        <RouterLink
          :to="{ name: 'login' }"
          class="land-card land-card--secondary"
          :class="{ 'is-active': hover === 'login' }"
          @mouseenter="hover = 'login'"
          @mouseleave="hover = ''"
        >
          <div class="land-card-icon">
            <v-icon size="20">mdi-shield-check-outline</v-icon>
          </div>
          <div class="land-card-kicker">Ya tengo cuenta</div>
          <div class="land-card-title">Iniciar sesión</div>
          <div class="land-card-desc">Accede a tu panel administrativo de siempre.</div>
          <div class="land-card-cta">
            Entrar <v-icon size="14" class="land-card-arrow">mdi-arrow-right</v-icon>
          </div>
        </RouterLink>
      </div>

      <div class="land-trust pub-reveal" style="animation-delay: 0.38s">
        <span v-for="t in trust" :key="t.label" class="land-trust-item">
          <v-icon size="15">{{ t.icon }}</v-icon> {{ t.label }}
        </span>
      </div>
    </main>

    <footer class="land-footer">
      <span>© 2026 VetSoftware</span>
      <div class="land-footer-links">
        <a href="#" @click.prevent>Privacidad</a>
        <a href="#" @click.prevent>Términos</a>
        <a href="#" @click.prevent>Soporte</a>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.land-stage {
  position: relative;
  width: 100%;
  min-height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: radial-gradient(ellipse at top, #f3e8ff 0%, #f5f1fa 48%, #ede8f4 100%);
  font-family: 'Inter', sans-serif;
  color: var(--pub-ink-900);
}
.land-glow {
  position: absolute;
  inset: 0;
  pointer-events: none;
  transition: background 0.18s ease-out;
}

.land-topbar {
  position: relative;
  padding: 26px 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}
.land-brand {
  display: flex;
  align-items: center;
  gap: 11px;
}
.land-brand-mark {
  width: 32px;
  height: 32px;
  border-radius: 9px;
  background: linear-gradient(135deg, #a855f7, #581c87);
  display: grid;
  place-items: center;
  color: #fff;
  box-shadow: 0 4px 10px -2px rgba(126, 34, 206, 0.45);
}
.land-brand-word {
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.01em;
}
.land-login-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--pub-ink-700);
  text-decoration: none;
  padding: 9px 15px;
  border-radius: 9px;
  border: 1px solid #e6ddf0;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(6px);
  transition: all 0.16s;
}
.land-login-btn:hover {
  background: #fff;
  border-color: #d6c8ea;
}

.land-main {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 12px 24px 8px;
  text-align: center;
  min-height: 0;
}
.land-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 13px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid #ecd9fb;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--pub-ame-700);
  text-transform: uppercase;
}
.land-h1 {
  font-family: 'Instrument Serif', serif;
  font-weight: 400;
  font-size: clamp(38px, 5.4vw, 64px);
  line-height: 1.12;
  letter-spacing: -0.02em;
  margin: 22px 0 0;
  max-width: 820px;
  text-wrap: balance;
}
.land-h1-em {
  font-style: italic;
  color: var(--pub-ame-700);
}
.land-sub {
  font-size: 16px;
  line-height: 1.55;
  color: var(--pub-ink-500);
  margin: 20px 0 0;
  max-width: 500px;
}

.land-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
  margin-top: 40px;
  width: 100%;
  max-width: 720px;
}
.land-card {
  position: relative;
  overflow: hidden;
  text-align: left;
  text-decoration: none;
  display: flex;
  flex-direction: column;
  padding: 24px 24px 22px;
  border-radius: 16px;
  transition:
    transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1),
    box-shadow 0.2s,
    border-color 0.2s;
}
.land-card.is-active {
  transform: translateY(-4px);
}
.land-card--primary {
  background: linear-gradient(160deg, #9333ea, #7e22ce 70%, #6b1fa8);
  color: #fff;
  border: 1px solid transparent;
  box-shadow: 0 12px 28px -12px rgba(126, 34, 206, 0.4);
}
.land-card--primary.is-active {
  box-shadow: 0 22px 44px -14px rgba(126, 34, 206, 0.55);
}
.land-card--secondary {
  background: #fff;
  color: var(--pub-ink-900);
  border: 1px solid var(--pub-line);
  box-shadow: 0 8px 20px -12px rgba(91, 33, 182, 0.12);
}
.land-card--secondary.is-active {
  border-color: #d6c8ea;
  box-shadow: 0 22px 44px -16px rgba(91, 33, 182, 0.22);
}
.land-card-glow {
  position: absolute;
  top: -40px;
  right: -40px;
  width: 160px;
  height: 160px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.18), transparent 65%);
  pointer-events: none;
  transition: transform 0.3s;
}
.land-card--primary.is-active .land-card-glow {
  transform: scale(1.15);
}
.land-card-icon {
  width: 42px;
  height: 42px;
  border-radius: 11px;
  display: grid;
  place-items: center;
  margin-bottom: 16px;
}
.land-card--primary .land-card-icon {
  background: rgba(255, 255, 255, 0.16);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.22);
}
.land-card--secondary .land-card-icon {
  background: linear-gradient(135deg, #f3e8ff, #e9d5ff);
  color: var(--pub-ame-700);
  border: 1px solid #ecd9fb;
}
.land-card-kicker {
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  margin-bottom: 5px;
}
.land-card--primary .land-card-kicker {
  color: rgba(255, 255, 255, 0.7);
}
.land-card--secondary .land-card-kicker {
  color: #a08bbd;
}
.land-card-title {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.01em;
}
.land-card-desc {
  font-size: 13.5px;
  line-height: 1.5;
  margin-top: 7px;
}
.land-card--primary .land-card-desc {
  color: rgba(255, 255, 255, 0.82);
}
.land-card--secondary .land-card-desc {
  color: var(--pub-ink-500);
}
.land-card-cta {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin-top: 18px;
  font-size: 13.5px;
  font-weight: 600;
}
.land-card--primary .land-card-cta {
  color: #fff;
}
.land-card--secondary .land-card-cta {
  color: var(--pub-ame-700);
}
.land-card-arrow {
  transition: transform 0.2s;
}
.land-card.is-active .land-card-arrow {
  transform: translateX(4px);
}

.land-trust {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 24px;
  margin-top: 34px;
  font-size: 12.5px;
  color: var(--pub-ink-400);
}
.land-trust-item {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}
.land-trust-item :deep(.v-icon) {
  color: var(--pub-ame-500);
}

.land-footer {
  position: relative;
  padding: 18px 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: var(--pub-ink-400);
  flex-shrink: 0;
}
.land-footer-links {
  display: flex;
  gap: 18px;
}
.land-footer-links a {
  color: var(--pub-ink-400);
  text-decoration: none;
}
.land-footer-links a:hover {
  color: var(--pub-ink-500);
}

@media (max-width: 720px) {
  .land-cards {
    grid-template-columns: 1fr;
  }
  .land-topbar,
  .land-footer {
    padding-left: 24px;
    padding-right: 24px;
  }
}
</style>
