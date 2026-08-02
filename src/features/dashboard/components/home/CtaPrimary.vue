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
  background: linear-gradient(135deg, oklch(45% 0.18 var(--hue)), oklch(38% 0.18 295deg));
  color: white;
  border-radius: 16px;
  padding: 28px 30px;
  box-shadow:
    0 1px 2px rgb(50 20 80 / 8%),
    0 8px 24px -8px oklch(40% 0.18 var(--hue) / 50%);
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease;
}

.cta-primary:hover {
  transform: translateY(-1px);
  box-shadow:
    0 1px 2px rgb(50 20 80 / 10%),
    0 12px 28px -8px oklch(40% 0.18 var(--hue) / 55%);
}

.decor {
  position: absolute;
  top: -60px;
  right: -60px;
  width: 220px;
  height: 220px;
  background: radial-gradient(circle, oklch(70% 0.18 var(--hue) / 40%), transparent 60%);
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
  gap: 6px;
  padding: 9px 16px;
  border-radius: 8px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  transition: filter 0.12s ease;
}

.btn-primary {
  background: white;
  color: var(--amatista-700);
}

.btn-primary:hover {
  filter: brightness(0.96);
}

.btn-ghost {
  background: oklch(60% 0.1 var(--hue) / 25%);
  color: white;
  border-color: oklch(80% 0.06 var(--hue) / 30%);
}

.btn-ghost:hover {
  background: oklch(60% 0.1 var(--hue) / 35%);
}
</style>
