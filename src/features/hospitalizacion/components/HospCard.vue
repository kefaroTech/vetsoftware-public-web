<script setup lang="ts">
import HospStatusPill from './HospStatusPill.vue'
import { initials, formatDateShort } from '@/composables/format'
import { daysSince } from '../composables/mar'
import type { HospitalizationResponse } from '@/features/dashboard/views/consulta/nueva/types/hospitalization.types'

defineProps<{ patient: HospitalizationResponse }>()
defineEmits<{ open: [] }>()
</script>

<template>
  <button type="button" class="card ds-stack" @click="$emit('open')">
    <div class="top ds-block-head">
      <!-- TODO backend: Hospitalization no expone status clínico; default ESTABLE -->
      <HospStatusPill status="ESTABLE" />
      <span class="day ds-hint">Día {{ daysSince(patient.startDate) }}</span>
    </div>
    <div class="ds-flex-row ds-flex-row--12">
      <div class="avatar">{{ initials(patient.animal.name) }}</div>
      <div class="who">
        <div class="name ds-item-label">{{ patient.animal.name }}</div>
        <div class="code">{{ patient.animal.code }}</div>
      </div>
    </div>
    <p class="reason">{{ patient.reason }}</p>
    <div class="foot ds-hint">Ingreso · {{ formatDateShort(patient.startDate) }}</div>
  </button>
</template>

<style scoped>
.card {
  gap: var(--space-11);
  text-align: left;
  width: 100%;
  padding: 16px;
  background: var(--warm-50);
  border: 1px solid var(--warm-450);
  border-radius: 14px;
  cursor: pointer;
  font-family: inherit;
  transition:
    border-color 0.12s ease,
    box-shadow 0.12s ease;
}

/* A11Y-09: `--amatista-300` daba 2,02:1, por debajo del reposo `--warm-450`
   (3,55:1) — el hover apagaba el borde de una tarjeta pulsable.
   `--amatista-450` da 3,77:1. */
.card:hover {
  border-color: var(--amatista-450);
  box-shadow: 0 6px 18px -10px rgb(20 15 30 / 25%);
}

/* Resto sobre `.ds-block-head`: aquí el hueco lo pone el `gap` de `.ds-stack` de
   la tarjeta, así que se anula el `margin-bottom` de la primitiva. */
.top {
  margin-bottom: 0;
}

.day {
  font-weight: var(--weight-medium);
}

.avatar {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: var(--amatista-100);
  color: var(--amatista-700);
  font-family: var(--font-serif);
  font-size: 17px;
  font-weight: 500;
  flex-shrink: 0;
}

.name {
  font-size: var(--text-2xl);
}

.code {
  font-size: 12px;
  color: var(--warm-500);
  font-family: var(--font-mono);
}

.reason {
  margin: 0;
  font-size: 13px;
  color: var(--warm-700);
  line-height: 1.45;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.foot {
  padding-top: var(--space-9);
  border-top: 1px solid var(--warm-150);
}
</style>
