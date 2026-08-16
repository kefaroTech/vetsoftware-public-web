<script setup lang="ts">
import DetailField from '../DetailField.vue'
import { formatEventDate } from '../../composables/format'
import type { DiagnosticImagingResponse } from '@/features/dashboard/views/consulta/nueva/types/diagnosticImaging.types'

defineProps<{ data: DiagnosticImagingResponse }>()
</script>

<template>
  <div class="ds-detail-grid">
    <DetailField label="Tipo de imagen" :value="data.diagnosticImagingType.name" />
    <DetailField label="Fecha" :value="formatEventDate(data.date)" />
    <DetailField label="Tipo de estudio" :value="data.studyType" span="full" />
    <DetailField label="Signos clínicos" :value="data.clinicalSigns" span="full" />
    <DetailField label="Diagnóstico" :value="data.diagnosis" span="full" />
    <DetailField label="Observaciones" :value="data.observations" span="full" />
    <DetailField v-if="data.consultation" label="Consulta vinculada" span="full">
      #{{ data.consultation.id }} · {{ formatEventDate(data.consultation.date) }}
    </DetailField>
  </div>
</template>
