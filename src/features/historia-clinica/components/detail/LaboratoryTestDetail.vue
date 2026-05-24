<script setup lang="ts">
import DetailField from '../DetailField.vue'
import { formatEventDate } from '../../composables/format'
import type { LaboratoryTestResponse } from '@/features/dashboard/views/consulta/nueva/api/laboratoryTest.api'

defineProps<{ data: LaboratoryTestResponse }>()
</script>

<template>
  <div class="detail-grid">
    <DetailField label="Tipo de examen" :value="data.testType.name" />
    <DetailField label="Fecha" :value="formatEventDate(data.date)" />
    <DetailField label="Cantidad" :value="data.quantity" />
    <DetailField label="Diagnóstico" :value="data.diagnosis" span="full" />
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
