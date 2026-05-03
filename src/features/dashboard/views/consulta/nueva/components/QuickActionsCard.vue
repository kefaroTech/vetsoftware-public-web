<script setup lang="ts">
import {
  Sparkles,
  Pill,
  FlaskConical,
  ScanLine,
  Syringe,
} from 'lucide-vue-next'
import SectionCard from '@/features/dashboard/components/ui/SectionCard.vue'

const actions = [
  { icon: Pill, label: 'Receta', sub: 'Medicamentos' },
  { icon: FlaskConical, label: 'Examen lab.', sub: 'Solicitud' },
  { icon: ScanLine, label: 'Imagen Dx', sub: 'Rayos X / Eco' },
  { icon: Syringe, label: 'Vacunación', sub: 'Aplicar dosis' },
]
</script>

<template>
  <SectionCard
    :icon="Sparkles"
    title="Acciones rápidas"
    subtitle="Genera registros vinculados a esta consulta"
  >
    <div class="grid">
      <button
        v-for="a in actions"
        :key="a.label"
        type="button"
        class="action"
      >
        <div class="ic">
          <component :is="a.icon" :size="15" :stroke-width="1.6" />
        </div>
        <div class="meta">
          <div class="lab">{{ a.label }}</div>
          <div class="sub">{{ a.sub }}</div>
        </div>
      </button>
    </div>
  </SectionCard>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}
@media (max-width: 880px) {
  .grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
.action {
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 10px;
  padding: 12px 14px;
  font-family: inherit;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  text-align: left;
  transition: border-color 0.15s, background 0.15s;
}
.action:hover {
  border-color: var(--amatista-700);
  background: var(--amatista-50);
}
.ic {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: var(--amatista-50);
  color: var(--amatista-700);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.lab {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--warm-900);
}
.sub {
  font-size: 11px;
  color: var(--warm-500);
  margin-top: 1px;
}
</style>
