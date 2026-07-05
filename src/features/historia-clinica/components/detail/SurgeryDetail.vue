<script setup lang="ts">
import DetailField from '../DetailField.vue'
import { formatEventDate } from '../../composables/format'
import type { SurgeryResponse } from '@/features/dashboard/views/consulta/nueva/api/surgery.api'

defineProps<{ data: SurgeryResponse }>()
</script>

<template>
  <div class="detail-grid">
    <DetailField label="Tipo de cirugía" :value="data.surgeryType.name" />
    <DetailField label="Fecha" :value="formatEventDate(data.date)" />
    <DetailField label="Descripción" :value="data.description" span="full" />
    <DetailField label="Medicamento" :value="data.medicament" span="full" />
    <DetailField label="Observaciones" :value="data.observations" span="full" />
    <DetailField label="Complicaciones" :value="data.complications" span="full" />
    <DetailField
      v-if="data.consultation"
      label="Consulta vinculada"
      span="full"
    >
      #{{ data.consultation.id }} · {{ formatEventDate(data.consultation.date) }}
    </DetailField>
  </div>
</template>

<style scoped>
.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 24px;
}
@media (max-width: 560px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }
}
</style>
