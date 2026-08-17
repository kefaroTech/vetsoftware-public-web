<script setup lang="ts">
import { BedDouble } from 'lucide-vue-next'
import HospCard from './HospCard.vue'
import type { HospitalizationResponse } from '@/features/dashboard/views/consulta/nueva/types/hospitalization.types'

defineProps<{ items: HospitalizationResponse[]; loading: boolean }>()
defineEmits<{ open: [patient: HospitalizationResponse] }>()
</script>

<template>
  <div>
    <div v-if="!loading && items.length === 0" class="empty ds-empty ds-stack ds-stack--8">
      <BedDouble :size="32" :stroke-width="1.4" />
      <p>Sin pacientes internados</p>
      <span>Las hospitalizaciones activas (sin fecha de alta) aparecen aquí.</span>
    </div>
    <div v-else class="grid">
      <HospCard v-for="p in items" :key="p.id" :patient="p" @open="$emit('open', p)" />
    </div>
  </div>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
}

.empty {
  align-items: center;
  padding: 56px var(--space-20);
}

.empty p {
  margin: 0;
  font-size: 15px;
  font-weight: 500;
  color: var(--warm-700);
}

.empty span {
  font-size: 13px;
  max-width: 360px;
}
</style>
