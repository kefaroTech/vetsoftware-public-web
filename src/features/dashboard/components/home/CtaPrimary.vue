<script setup lang="ts">
import { useRouter } from 'vue-router'
import { Plus } from 'lucide-vue-next'
import { useNuevaConsultaDraft } from '@/features/dashboard/views/consulta/nueva/composables/useNuevaConsultaDraft'
import { showResumeOrNewDialog } from '@/composables/useConsultaResumeGuard'

const router = useRouter()
const draft = useNuevaConsultaDraft()

function goNueva() {
  if (draft.state.owner) {
    showResumeOrNewDialog({
      ownerName: draft.state.owner.name,
      petName: draft.state.pet?.name,
      step: draft.state.step,
      onContinue: () =>
        router.push({
          name: 'consulta-nueva',
          query: { paso: String(draft.state.step) },
        }),
      onCreateNew: () => {
        draft.reset()
        router.push({ name: 'consulta-nueva', query: { paso: '1' } })
      },
    })
    return
  }
  router.push({ name: 'consulta-nueva' })
}

function goHistorial() {
  router.push({ name: 'consulta-historial' })
}
</script>

<template>
  <section class="cta-primary">
    <div class="decor" />
    <div class="content">
      <div class="eyebrow">ACCIÓN RÁPIDA</div>
      <h2 class="title">Iniciar una nueva consulta</h2>
      <p class="desc">
        Registra el motivo, examen físico, diagnóstico y tratamiento del paciente en una sola
        pantalla.
      </p>
      <div class="actions">
        <button type="button" class="btn-primary" @click="goNueva">
          <Plus :size="14" :stroke-width="1.5" />
          <span>Nueva consulta</span>
        </button>
        <button type="button" class="btn-ghost" @click="goHistorial">Ver historial</button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.cta-primary {
  position: relative;
  overflow: hidden;
  background: var(--gradient-primary);
  color: var(--warm-50);
  border-radius: 16px;
  padding: 28px 30px;
  box-shadow:
    var(--shadow-xs),
    0 8px 24px -8px color-mix(in oklch, var(--amatista-700) 50%, transparent);
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease;
}

.cta-primary:hover {
  transform: translateY(-1px);
  box-shadow:
    var(--shadow-xs),
    0 12px 28px -8px color-mix(in oklch, var(--amatista-700) 55%, transparent);
}

.decor {
  position: absolute;
  top: -60px;
  right: -60px;
  width: 220px;
  height: 220px;
  background: radial-gradient(
    circle,
    color-mix(in oklch, var(--amatista-400) 40%, transparent),
    transparent 60%
  );
  pointer-events: none;
}

.content {
  position: relative;
  z-index: 1;
}

.eyebrow {
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  opacity: 0.7;
  font-weight: 500;
}

.title {
  margin: 8px 0 10px;
  font-size: 22px;
  font-weight: 500;
  letter-spacing: -0.01em;
}

.desc {
  margin: 0;
  font-size: 13px;
  opacity: 0.75;
  line-height: 1.5;
  max-width: 380px;
}

.actions {
  display: flex;
  gap: 8px;
  margin-top: 22px;
}

.btn-primary,
.btn-ghost {
  display: inline-flex;
  align-items: center;
  gap: var(--space-6);
  padding: var(--space-9) var(--space-16);
  border-radius: var(--radius-md);
  font-family: inherit;
  font-size: var(--text-body);
  font-weight: var(--weight-medium);
  cursor: pointer;
  border: 1px solid transparent;
  transition:
    filter var(--transition-fast),
    border-color var(--transition-fast),
    box-shadow var(--transition-fast);
}

.btn-primary {
  background: var(--warm-50);
  color: var(--amatista-700);
}

.btn-primary:hover {
  filter: brightness(0.96);
}

/* Sin relleno a propósito. El fondo de este botón no es una superficie del
   sistema sino el gradiente de marca, así que un velo translúcido metería un
   píxel compuesto bajo el texto y bajo el borde, y §1.4.3 y §1.4.11 de WCAG 2.2
   miden ese compuesto y no el color declarado. Opaco sobre opaco, el contraste
   deja de depender de dónde caiga el degradado bajo el botón. */
.btn-ghost {
  background: transparent;
  color: var(--warm-50);
  border-color: var(--amatista-200);
}

/* El realce del hover va por FUERA del botón, para no reintroducir un velo
   bajo el texto. */
.btn-ghost:hover {
  border-color: var(--warm-50);
  box-shadow: 0 0 0 3px var(--overlay-light-10);
}

/* Anillo propio y no `var(--ring)`: la banda exterior de ese token es
   `--amatista-500`, que sobre el gradiente de marca queda casi al mismo tono
   que la tarjeta y se pierde. Sobre superficie de acento el indicador tiene que
   ser claro y opaco, igual que hace `.pub-focus-ring--on-accent` en la zona
   pública. Va en `outline` y no en `box-shadow` para que no compita con el
   realce del `:hover`, que sí usa esa propiedad. */
.btn-primary:focus-visible,
.btn-ghost:focus-visible {
  outline: 2px solid var(--warm-50);
  outline-offset: 2px;
}
</style>
