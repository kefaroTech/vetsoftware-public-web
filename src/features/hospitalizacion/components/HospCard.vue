<script setup lang="ts">
import HospStatusPill from './HospStatusPill.vue'
import { initials, formatDateShort } from '@/composables/format'
import { daysSince } from '../composables/mar'
import type { HospitalizationResponse } from '@/features/dashboard/views/consulta/nueva/types/hospitalization.types'

defineProps<{ patient: HospitalizationResponse }>()
defineEmits<{ open: [] }>()
</script>

<template>
  <button type="button" class="card" @click="$emit('open')">
    <div class="top">
      <!-- TODO backend: Hospitalization no expone status clínico; default ESTABLE -->
      <HospStatusPill status="ESTABLE" />
      <span class="day">Día {{ daysSince(patient.startDate) }}</span>
    </div>
    <div class="ident">
      <div class="avatar">{{ initials(patient.animal.name) }}</div>
      <div class="who">
        <div class="name">{{ patient.animal.name }}</div>
        <div class="code">{{ patient.animal.code }}</div>
      </div>
    </div>
    <p class="reason">{{ patient.reason }}</p>
    <div class="foot">Ingreso · {{ formatDateShort(patient.startDate) }}</div>
  </button>
</template>

<style scoped>
.card {
  display: flex;
  flex-direction: column;
  gap: 11px;
  text-align: left;
  width: 100%;
  padding: 16px;
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 14px;
  cursor: pointer;
  font-family: inherit;
  transition:
    border-color 0.12s ease,
    box-shadow 0.12s ease;
}

.card:hover {
  border-color: var(--amatista-300);
  box-shadow: 0 6px 18px -10px rgb(20 15 30 / 25%);
}

.top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.day {
  font-size: 11.5px;
  color: var(--warm-500);
  font-weight: 500;
}

.ident {
  display: flex;
  align-items: center;
  gap: 12px;
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
  font-size: 15px;
  font-weight: 500;
  color: var(--warm-900);
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
  font-size: 11.5px;
  color: var(--warm-500);
  border-top: 1px solid var(--warm-150);
  padding-top: 9px;
}
</style>
