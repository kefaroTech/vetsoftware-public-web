<script setup lang="ts">
import DetailField from '../DetailField.vue'
import { formatEventDate } from '../../composables/format'
import type { DiagnosticImagingResponse } from '@/features/dashboard/views/consulta/nueva/api/diagnosticImaging.api'

defineProps<{ data: DiagnosticImagingResponse }>()
</script>

<template>
  <div class="detail-grid">
    <DetailField label="Tipo de imagen" :value="data.diagnosticImagingType.name" />
    <DetailField label="Fecha" :value="formatEventDate(data.date)" />
    <DetailField label="Tipo de estudio" :value="data.studyType" span="full" />
    <DetailField label="Signos clínicos" :value="data.clinicalSigns" span="full" />
    <DetailField label="Diagnóstico" :value="data.diagnosis" span="full" />
    <DetailField label="Observaciones" :value="data.observations" span="full" />
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
