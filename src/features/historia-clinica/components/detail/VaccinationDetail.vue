<script setup lang="ts">
import DetailField from '../DetailField.vue'
import { formatEventDate } from '../../composables/format'
import type { VaccinationResponse } from '@/features/dashboard/views/consulta/nueva/api/vaccination.api'

defineProps<{ data: VaccinationResponse }>()
</script>

<template>
  <div class="detail-grid">
    <DetailField label="Tipo de vacuna" :value="data.vaccinationType.name" />
    <DetailField label="Fecha" :value="formatEventDate(data.date)" />
    <DetailField label="Lote" :value="data.lot" />
    <DetailField
      label="Próxima vacunación"
      :value="data.nextVaccination ? formatEventDate(data.nextVaccination) : null"
    />
    <DetailField label="Notas" :value="data.notes" span="full" />
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
  gap: 18px 24px;
}
@media (max-width: 560px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }
}
</style>
