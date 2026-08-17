<script setup lang="ts">
import { AlertTriangle, LockKeyhole, RefreshCw } from 'lucide-vue-next'

/**
 * Pantalla de bloqueo del punto de venta: el POS no deja vender sin una caja
 * abierta a nombre del empleado y en la sede activa.
 *
 * Son cuatro estados excluyentes (comprobando / no se pudo comprobar / sin caja
 * / caja en otra sede). Vivían dentro de `POSView` y eran ~55 líneas de marcado
 * más ~110 de CSS que no compartía nada con el resto de la vista.
 */
defineProps<{
  /** Aún no terminó la comprobación inicial. */
  checking: boolean
  /** La comprobación terminó pero falló (no se pudo consultar el backend). */
  loadFailed: boolean
  /** El empleado no tiene ninguna caja abierta. */
  noSession: boolean
  /** Tiene caja, pero abierta en una sede distinta a la activa. */
  branchMismatch: boolean
  /** Nombre de la sede donde está su caja (para el mensaje del último estado). */
  cashBranchLabel: string
  /** Terminal de esa caja. */
  terminal?: string
}>()

const emit = defineEmits<{ retry: []; goToCash: []; useCashBranch: [] }>()
</script>

<template>
  <section v-if="checking" class="cash-gate checking" aria-live="polite">
    <div class="cash-gate-card ds-stack">
      <span class="cash-lock-icon"><RefreshCw :size="26" class="spin" /></span>
      <span class="cash-gate-kicker">Validando caja</span>
      <h2>Estamos comprobando tu sesión</h2>
      <p>Espera un momento antes de comenzar a vender.</p>
    </div>
  </section>

  <section v-else-if="loadFailed" class="cash-gate" aria-live="polite">
    <div class="cash-gate-card ds-stack">
      <span class="cash-lock-icon error"><AlertTriangle :size="28" /></span>
      <span class="cash-gate-kicker">No pudimos validar la caja</span>
      <h2>El punto de venta permanece bloqueado</h2>
      <p>Vuelve a intentar la comprobación para continuar de forma segura.</p>
      <button type="button" class="cash-gate-btn secondary" @click="emit('retry')">
        <RefreshCw :size="16" /> Reintentar
      </button>
    </div>
  </section>

  <section v-else-if="noSession" class="cash-gate" aria-live="polite">
    <div class="cash-gate-card ds-stack">
      <span class="cash-lock-icon"><LockKeyhole :size="30" /></span>
      <span class="cash-gate-kicker">Punto de venta bloqueado</span>
      <h2>Debes abrir tu caja antes de vender</h2>
      <p>
        Abre una caja a tu nombre. Cuando regreses podrás agregar productos, cobrar y registrar los
        movimientos de la venta.
      </p>
      <button type="button" class="cash-gate-btn" @click="emit('goToCash')">
        <LockKeyhole :size="16" /> Ir a abrir caja
      </button>
    </div>
  </section>

  <section v-else-if="branchMismatch" class="cash-gate" aria-live="polite">
    <div class="cash-gate-card ds-stack">
      <span class="cash-lock-icon"><LockKeyhole :size="30" /></span>
      <span class="cash-gate-kicker">Caja abierta en otra sede</span>
      <h2>Usa la sede asociada a tu caja</h2>
      <p>
        Tu caja está abierta en {{ cashBranchLabel }}, terminal {{ terminal }}. Cambia el contexto
        para registrar allí las ventas.
      </p>
      <button type="button" class="cash-gate-btn" @click="emit('useCashBranch')">
        Usar {{ cashBranchLabel }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.cash-gate {
  position: relative;
  min-height: 520px;
  display: grid;
  place-items: center;
  overflow: hidden;
  border: 1px solid var(--warm-200);
  border-radius: 18px;
  padding: 32px;
  background: linear-gradient(145deg, var(--warm-50), var(--amatista-50, #f7f1fb));
}

.cash-gate::before {
  content: '';
  position: absolute;
  inset: 0;
  opacity: 0.38;
  background-image:
    linear-gradient(var(--warm-200) 1px, transparent 1px),
    linear-gradient(90deg, var(--warm-200) 1px, transparent 1px);
  background-size: 42px 42px;
  mask-image: linear-gradient(to bottom, #000, transparent 88%);
}

/* La columna es `.ds-stack` (primitives.css). El resto de esta pantalla no
   tiene equivalente en la capa 2 y se documenta en el informe FE-08: el kicker
   es de acento de marca (amatista-700 / 700 / .12em) y no la firma de
   `.ds-kicker`, y el CTA lleva peso 650 y sombra propia, así que heredar
   `.ds-btn` obligaría a sobrescribirle cuatro propiedades. */
.cash-gate-card {
  position: relative;
  z-index: 1;
  width: min(100%, 520px);
  align-items: center;
  text-align: center;
  padding: 38px 34px;
  border: 1px solid color-mix(in srgb, var(--amatista-300, #c9a9df) 55%, transparent);
  border-radius: 18px;
  background: color-mix(in srgb, var(--warm-50) 94%, transparent);
  box-shadow: 0 22px 55px -34px rgb(40 24 55 / 45%);
  backdrop-filter: blur(8px);
}

.cash-lock-icon {
  width: 64px;
  height: 64px;
  display: grid;
  place-items: center;
  margin-bottom: 18px;
  border-radius: 18px;
  color: var(--amatista-700);
  background: var(--amatista-100, #efe6f7);
  box-shadow: inset 0 0 0 1px var(--amatista-200, #ddc9eb);
}

.cash-lock-icon.error {
  color: var(--danger-700);
  background: oklch(94% 0.05 25deg);
  box-shadow: inset 0 0 0 1px oklch(84% 0.1 25deg);
}

/* El rótulo de acento de marca es `.ds-kicker-accent ds-kicker-accent--wide`
   (primitives.css): coincidía con la primitiva en sus cinco declaraciones. */

.cash-gate h2 {
  margin: 8px 0 10px;
  font-family: var(--font-serif);
  font-size: clamp(23px, 3vw, 31px);
  font-weight: 500;
  color: var(--warm-900);
}

.cash-gate p {
  max-width: 450px;
  margin: 0;
  color: var(--warm-600);
  font-size: 14px;
  line-height: 1.65;
}

.cash-gate-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 24px;
  border: none;
  border-radius: 10px;
  padding: 11px 18px;
  background: var(--amatista-700);
  color: #fff;
  font-family: inherit;
  font-size: 13.5px;
  font-weight: 650;
  cursor: pointer;
  box-shadow: 0 8px 20px -12px var(--amatista-900, #3e1d61);
}

.cash-gate-btn:hover {
  filter: brightness(1.06);
}

.cash-gate-btn.secondary {
  color: var(--amatista-700);
  background: var(--warm-50);
  border: 1px solid var(--amatista-300, #c9a9df);
  box-shadow: none;
}

.spin {
  animation: cash-spin 0.9s linear infinite;
}

@keyframes cash-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
