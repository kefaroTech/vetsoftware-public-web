<script setup lang="ts">
import {
  Zap,
  Pill,
  Beaker,
  Image as ImageIcon,
  Shield,
  BedDouble,
  Bug,
  Scissors,
  Plus,
} from 'lucide-vue-next'
import SectionCard from '@/components/ui/SectionCard.vue'
import type { ActionKind } from '../composables/useNuevaConsultaDraft'

defineProps<{
  counts: Record<ActionKind, number>
}>()

const emit = defineEmits<{ select: [kind: ActionKind] }>()

interface QuickAction {
  kind: ActionKind | null
  icon: typeof Pill
  label: string
  sub: string
  muted?: boolean
}

const actions: QuickAction[] = [
  { kind: 'receta', icon: Pill, label: 'Plan terapéutico', sub: 'Medicamentos / receta' },
  { kind: 'lab', icon: Beaker, label: 'Examen lab.', sub: 'Solicitud' },
  { kind: 'imaging', icon: ImageIcon, label: 'Imagen Dx', sub: 'Rayos X / Eco' },
  { kind: 'vaccination', icon: Shield, label: 'Vacunación', sub: 'Aplicar dosis' },
  { kind: 'hospitalization', icon: BedDouble, label: 'Hospitalización', sub: 'Internar paciente' },
  { kind: 'deworming', icon: Bug, label: 'Desparasitación', sub: 'Interna / externa' },
  { kind: 'surgery', icon: Scissors, label: 'Cirugía', sub: 'Programar pabellón' },
  { kind: null, icon: Plus, label: 'Más', sub: 'Otras acciones', muted: true },
]

function pick(action: QuickAction) {
  if (action.muted || !action.kind) return
  emit('select', action.kind)
}
</script>

<template>
  <SectionCard
    accent
    :icon="Zap"
    title="Plan Diagnóstico y Terapéutico"
    subtitle="Exámenes, imágenes, receta y procedimientos vinculados a la consulta."
  >
    <div class="grid">
      <button
        v-for="a in actions"
        :key="a.label"
        type="button"
        class="action"
        :class="{
          muted: a.muted,
          highlighted: a.kind ? counts[a.kind] > 0 : false,
        }"
        @click="pick(a)"
      >
        <div class="ic" :class="{ filled: a.kind ? counts[a.kind] > 0 : false }">
          <component :is="a.icon" :size="17" :stroke-width="1.6" />
        </div>
        <div class="meta">
          <div class="lab">{{ a.label }}</div>
          <div class="sub">
            {{
              a.kind && counts[a.kind] > 0
                ? `${counts[a.kind]} generada${counts[a.kind] === 1 ? '' : 's'} · click para añadir más`
                : a.sub
            }}
          </div>
        </div>
        <div v-if="a.kind && counts[a.kind] > 0" class="count-badge" aria-hidden="true">
          {{ counts[a.kind] }}
        </div>
      </button>
    </div>
  </SectionCard>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

@media (width <= 880px) {
  .grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.action {
  position: relative;
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 11px;
  padding: 12px;
  font-family: inherit;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 8px;
  text-align: left;
  transition:
    border-color 0.15s,
    background 0.15s;
}

.action:hover {
  border-color: var(--amatista-700);
  background: var(--amatista-50);
}

.action.muted {
  opacity: 0.55;
  cursor: not-allowed;
}

.action.muted:hover {
  border-color: var(--warm-200);
  background: var(--warm-50);
}

.action.highlighted {
  border-width: 1.5px;
  border-color: var(--amatista-500);
  background: var(--amatista-50);
  padding: 11.5px;
}

.ic {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  background: var(--amatista-50);
  color: var(--amatista-700);
  display: grid;
  place-items: center;
  flex-shrink: 0;
  transition:
    background 0.15s,
    color 0.15s;
}

.ic.filled {
  background: var(--amatista-700);
  color: white;
}

.lab {
  font-size: 13px;
  font-weight: 500;
  color: var(--warm-900);
}

.sub {
  font-size: 11.5px;
  color: var(--warm-500);
  margin-top: 2px;
}

.count-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 10px;
  background: var(--amatista-700);
  color: white;
  font-size: 11px;
  font-weight: 600;
  display: grid;
  place-items: center;
}
</style>
